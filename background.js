const MENU_ID = "gloss-explain";
const API_URL = "https://api.anthropic.com/v1/messages";
const DEFAULT_MODEL = "claude-haiku-4-5-20251001";

const SYSTEM_PROMPT = `You explain things to a smart reader who happens not to know this particular thing.

Rules:
- First sentence is the gist, under 20 words, plain English, no hedging.
- Then at most three short sentences of detail: what it means, why it matters here, or what it's often confused with.
- Use the surrounding page only to disambiguate which sense is meant. Do not summarize the page.
- No markdown, no bullets, no preamble, no "this refers to". Start with the explanation itself.
- If the selection is a word with several meanings, explain the one the page context supports and say so in passing.
- If you genuinely don't know, say so in one sentence instead of guessing.`;

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: MENU_ID,
    title: 'Explain "%s"',
    contexts: ["selection"],
  });
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId !== MENU_ID || !tab?.id) return;
  chrome.tabs.sendMessage(tab.id, { type: "gloss:explain-selection" });
});

chrome.commands.onCommand.addListener((command, tab) => {
  if (command !== "explain-selection" || !tab?.id) return;
  chrome.tabs.sendMessage(tab.id, { type: "gloss:explain-selection" });
});

chrome.runtime.onMessage.addListener((msg) => {
  if (msg.type === "gloss:open-options") chrome.runtime.openOptionsPage();
});

// The content script opens a port per request; we stream deltas back over it.
chrome.runtime.onConnect.addListener((port) => {
  if (port.name !== "gloss") return;

  const controller = new AbortController();
  port.onDisconnect.addListener(() => controller.abort());

  port.onMessage.addListener(async (msg) => {
    if (msg.type !== "explain") return;
    try {
      await explain(msg.payload, port, controller.signal);
    } catch (err) {
      if (err.name === "AbortError") return;
      post(port, { type: "error", message: err.message || "Something went wrong." });
    }
  });
});

function post(port, msg) {
  try {
    port.postMessage(msg);
  } catch {
    // Port closed while streaming — the card was dismissed. Nothing to do.
  }
}

async function cacheKey({ text, context }) {
  const raw = `${text}\u0000${context.title}`;
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(raw));
  return "gloss:" + [...new Uint8Array(buf)].slice(0, 8).map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function explain(payload, port, signal) {
  const { apiKey, model } = await chrome.storage.local.get(["apiKey", "model"]);

  if (!apiKey) {
    post(port, { type: "needs-key" });
    return;
  }

  const key = await cacheKey(payload);
  const cached = await chrome.storage.session.get(key);
  if (cached[key]) {
    post(port, { type: "delta", text: cached[key] });
    post(port, { type: "done", cached: true });
    return;
  }

  const started = performance.now();
  const res = await fetch(API_URL, {
    method: "POST",
    signal,
    headers: {
      "content-type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      // Required for calls made directly from a browser context rather than a server.
      "anthropic-dangerous-direct-browser-access": "true",
    },
    body: JSON.stringify({
      model: model || DEFAULT_MODEL,
      max_tokens: 300,
      stream: true,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: buildUserMessage(payload) }],
    }),
  });

  if (!res.ok) {
    post(port, { type: "error", message: await readError(res) });
    return;
  }

  const full = await pump(res, port);
  post(port, { type: "done", ms: Math.round(performance.now() - started) });
  if (full.trim()) chrome.storage.session.set({ [key]: full });
}

function buildUserMessage({ text, context }) {
  const parts = [`Explain this: "${text}"`];
  if (context.title) parts.push(`\nPage title: ${context.title}`);
  if (context.surrounding) parts.push(`\nSurrounding text: ...${context.surrounding}...`);
  return parts.join("\n");
}

async function readError(res) {
  if (res.status === 401) return "That API key was rejected. Check it in settings.";
  if (res.status === 429) return "Rate limited by the API. Wait a moment and try again.";
  if (res.status === 529) return "The API is overloaded right now. Try again shortly.";
  try {
    const body = await res.json();
    return body?.error?.message || `API returned ${res.status}.`;
  } catch {
    return `API returned ${res.status}.`;
  }
}

// Parse the SSE stream and forward text deltas as they land.
async function pump(res, port) {
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let full = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    const lines = buffer.split("\n");
    buffer = lines.pop(); // keep the trailing partial line

    for (const line of lines) {
      if (!line.startsWith("data:")) continue;
      const data = line.slice(5).trim();
      if (!data || data === "[DONE]") continue;

      let event;
      try {
        event = JSON.parse(data);
      } catch {
        continue;
      }

      if (event.type === "content_block_delta" && event.delta?.type === "text_delta") {
        full += event.delta.text;
        post(port, { type: "delta", text: event.delta.text });
      } else if (event.type === "error") {
        post(port, { type: "error", message: event.error?.message || "Stream error." });
      }
    }
  }
  return full;
}
