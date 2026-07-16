# Gloss

Highlight anything on any page, right-click, and get a plain-English explanation in place. No sidebar, no tab switch, no copy-paste into a chat window.

Chrome extension, Manifest V3, no build step, no backend.

## Install

1. `chrome://extensions` → enable **Developer mode** → **Load unpacked** → select this folder.
2. Open the extension's settings and paste an Anthropic API key ([get one here](https://console.anthropic.com/settings/keys)).
3. Select text anywhere → right-click → **Explain**, or press `⌘⇧E` / `Ctrl+Shift+E`.

## How it works

```
selection ──▶ content.js ──port──▶ background.js ──▶ api.anthropic.com
                  ▲                                        │
                  └────────── streamed text deltas ────────┘
```

- **`content.js`** owns everything that touches the page: reading the selection, painting the marker, positioning and rendering the card.
- **`background.js`** owns everything that touches the network: the API key, the request, SSE parsing, caching.
- They talk over a **long-lived port** (`chrome.runtime.connect`) rather than one-shot messages, because the response streams. Dismissing the card disconnects the port, which aborts the in-flight fetch — no orphaned requests, no billing for tokens nobody reads.

## Decisions worth explaining

**Shadow DOM, not a plain div.** The card renders on top of pages whose CSS we've never seen. A `<div>` with classes gets mangled by any host page with an aggressive `* { }` reset or a colliding class name. The card lives in a closed style scope with `all: initial` on the host, so nothing leaks in either direction.

**Overlay rects, not `<mark>` wrapping.** The obvious way to highlight a selection is to wrap the range in a `<mark>`. That mutates the host page's DOM — which breaks React and Vue pages on their next render, destroys the user's actual selection, and can't span element boundaries cleanly. Instead the extension reads `range.getClientRects()` and paints absolutely-positioned rectangles in the shadow layer. Non-destructive, works across block boundaries, and survives framework re-renders because it never touched the page in the first place.

**Bring your own key.** An API key shipped inside an extension is a public API key — anyone can unzip a `.crx`. The alternatives are a proxy backend (cost, auth, rate limiting, a server to keep up) or BYOK. BYOK keeps this a static, backend-free extension, and the key is stored in `chrome.storage.local`, never synced. Direct browser calls to the API need the `anthropic-dangerous-direct-browser-access` header, which is the API acknowledging exactly this tradeoff.

**Page context, deliberately narrow.** The request includes the page title and the surrounding block's text, capped at ~700 characters, so the model can tell which sense of a word is meant. It's explicitly told to use that only for disambiguation, not to summarize — otherwise it drifts into describing the article instead of explaining the selection.

**Session cache, not local.** Explanations are cached in `chrome.storage.session`, keyed by a hash of the selection plus the page title. Re-explaining the same term on the same page is free and instant; the cache dies with the browser session, so nothing accumulates on disk.

**Haiku by default.** This is a lookup tool — the difference between one second and four seconds decides whether it gets used. Sonnet is one dropdown away for dense technical or legal passages.

## Files

| File | Role |
|---|---|
| `manifest.json` | MV3 config, permissions, keyboard command |
| `background.js` | Context menu, streaming API client, SSE parser, cache |
| `content.js` | Shadow-DOM card, selection marker, positioning |
| `options.html/js` | Key and model settings |
| `make_icons.py` | Regenerates the icon set from source |

## Known limits

- Doesn't run on `chrome://` pages or the Chrome Web Store — Chrome blocks content scripts there.
- Selections over 1200 characters are refused rather than truncated silently.
- Cross-iframe selections aren't stitched together; the card anchors to the top document.
