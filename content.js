(() => {
  if (window.__glossInstalled) return;
  window.__glossInstalled = true;

  const CARD_WIDTH = 340;
  const GAP = 14;
  let host = null;
  let shadow = null;
  let port = null;

  chrome.runtime.onMessage.addListener((msg) => {
    if (msg.type === "gloss:explain-selection") start();
  });

  function start() {
    const sel = window.getSelection();
    const text = sel?.toString().trim();
    if (!text) return;
    if (text.length > 1200) {
      open(sel, () => fail("That selection is too long. Try a sentence or two."));
      return;
    }

    const range = sel.getRangeAt(0);
    const context = gatherContext(range, text);
    open(sel, () => request({ text, context }));
  }

  // Grab a little surrounding prose so the model can disambiguate word senses.
  function gatherContext(range, text) {
    let node = range.commonAncestorContainer;
    if (node.nodeType === Node.TEXT_NODE) node = node.parentElement;
    const block = node?.closest("p, li, td, blockquote, h1, h2, h3, article, section") || node;
    let surrounding = (block?.innerText || "").replace(/\s+/g, " ").trim();
    if (surrounding.length > 700) {
      const at = surrounding.indexOf(text);
      const from = Math.max(0, at - 300);
      surrounding = surrounding.slice(from, from + 700);
    }
    if (surrounding === text) surrounding = "";
    return { title: document.title || "", surrounding };
  }

  function request(payload) {
    port = chrome.runtime.connect({ name: "gloss" });
    const body = shadow.querySelector(".body");
    const meta = shadow.querySelector(".meta");
    let text = "";

    port.onMessage.addListener((msg) => {
      if (msg.type === "delta") {
        text += msg.text;
        render(body, text);
      } else if (msg.type === "done") {
        shadow.querySelector(".card").classList.remove("streaming");
        meta.textContent = msg.cached ? "cached" : msg.ms ? `${(msg.ms / 1000).toFixed(1)}s` : "";
      } else if (msg.type === "error") {
        fail(msg.message);
      } else if (msg.type === "needs-key") {
        fail("No API key set yet.", true);
      }
    });

    port.postMessage({ type: "explain", payload });
  }

  // First sentence is the gist and gets display treatment; the rest is detail.
  function render(body, text) {
    const cut = text.search(/(?<=[.!?])\s/);
    const gist = cut === -1 ? text : text.slice(0, cut);
    const rest = cut === -1 ? "" : text.slice(cut).trim();
    body.innerHTML = "";
    const g = document.createElement("p");
    g.className = "gist";
    g.textContent = gist;
    body.appendChild(g);
    if (rest) {
      const r = document.createElement("p");
      r.className = "detail";
      r.textContent = rest;
      body.appendChild(r);
    }
  }

  function fail(message, showSettings) {
    if (!shadow) return;
    shadow.querySelector(".card").classList.remove("streaming");
    const body = shadow.querySelector(".body");
    body.innerHTML = "";
    const p = document.createElement("p");
    p.className = "gist";
    p.textContent = message;
    body.appendChild(p);
    if (showSettings) {
      const btn = document.createElement("button");
      btn.className = "settings";
      btn.textContent = "Add a key in settings";
      btn.onclick = () => chrome.runtime.sendMessage({ type: "gloss:open-options" });
      body.appendChild(btn);
    }
    shadow.querySelector(".meta").textContent = "";
  }

  function open(sel, then) {
    close();

    const range = sel.getRangeAt(0);
    const rects = [...range.getClientRects()].filter((r) => r.width > 0 && r.height > 0);
    if (!rects.length) return;

    host = document.createElement("div");
    host.style.cssText = "all: initial; position: absolute; top: 0; left: 0; z-index: 2147483647;";
    shadow = host.attachShadow({ mode: "open" });
    shadow.innerHTML = template();
    document.documentElement.appendChild(host);

    paintMarker(rects);
    place(rects);
    bindDismiss();
    then();
  }

  // Overlay rectangles instead of wrapping the selection in <mark>. Wrapping mutates
  // the host page's DOM, which breaks framework-rendered pages and any live selection.
  function paintMarker(rects) {
    const layer = shadow.querySelector(".marker-layer");
    for (const r of rects) {
      const m = document.createElement("div");
      m.className = "marker";
      m.style.left = `${r.left + scrollX}px`;
      m.style.top = `${r.top + scrollY}px`;
      m.style.width = `${r.width}px`;
      m.style.height = `${r.height}px`;
      layer.appendChild(m);
    }
  }

  function place(rects) {
    const card = shadow.querySelector(".card");
    const tether = shadow.querySelector(".tether");
    const first = rects[0];
    const last = rects[rects.length - 1];

    let left = Math.min(first.left + scrollX, innerWidth + scrollX - CARD_WIDTH - 12);
    left = Math.max(scrollX + 12, left);

    const roomBelow = innerHeight - last.bottom;
    const below = roomBelow > 220 || last.top < 220;
    const top = below ? last.bottom + scrollY + GAP : first.top + scrollY - GAP;

    card.style.left = `${left}px`;
    card.style.top = `${top}px`;
    if (!below) card.classList.add("flip");

    const anchorX = Math.max(left + 18, Math.min(first.left + scrollX + 8, left + CARD_WIDTH - 18));
    tether.style.left = `${anchorX}px`;
    tether.style.top = `${below ? last.bottom + scrollY : top}px`;
    tether.style.height = `${GAP}px`;
  }

  function bindDismiss() {
    const onKey = (e) => {
      if (e.key === "Escape") close();
    };
    const onClick = (e) => {
      if (!host?.contains(e.target)) close();
    };
    document.addEventListener("keydown", onKey, true);
    setTimeout(() => document.addEventListener("mousedown", onClick, true), 0);
    host.__cleanup = () => {
      document.removeEventListener("keydown", onKey, true);
      document.removeEventListener("mousedown", onClick, true);
    };
  }

  function close() {
    port?.disconnect();
    port = null;
    host?.__cleanup?.();
    host?.remove();
    host = null;
    shadow = null;
  }

  function template() {
    return `
      <style>
        :host { all: initial; }
        * { box-sizing: border-box; margin: 0; }

        .marker-layer { position: absolute; top: 0; left: 0; pointer-events: none; }
        .marker {
          position: absolute;
          /* The host element makes its own stacking context, so blend modes would have
             nothing to blend against. A translucent wash over the text does the job. */
          background: #F2C14E;
          opacity: .36;
          border-radius: 1px;
          animation: swipe .22s ease-out both;
          transform-origin: left center;
        }

        .tether {
          position: absolute;
          width: 1px;
          background: #C9C3B6;
          animation: drop .18s ease-out .1s both;
          transform-origin: top;
        }

        .card {
          --ink: #12161D;
          --paper: #FBFAF7;
          --rule: #E2DED5;
          --muted: #6E7480;
          --accent: #F2C14E;

          position: absolute;
          width: 340px;
          background: var(--paper);
          color: var(--ink);
          border: 1px solid var(--rule);
          border-radius: 3px;
          box-shadow: 0 1px 0 rgba(18,22,29,.04), 0 8px 28px -6px rgba(18,22,29,.18);
          padding: 13px 15px 11px;
          animation: rise .18s ease-out .12s both;
        }
        .card.flip { transform: translateY(-100%); }

        .head {
          display: flex; align-items: baseline; justify-content: space-between;
          gap: 10px; padding-bottom: 8px; margin-bottom: 9px;
          border-bottom: 1px solid var(--rule);
        }
        .label {
          font: 500 9.5px/1 ui-monospace, "SF Mono", Menlo, monospace;
          letter-spacing: .14em; text-transform: uppercase; color: var(--muted);
        }
        .label b { color: var(--ink); font-weight: 600; }
        .meta { font: 400 9.5px/1 ui-monospace, "SF Mono", Menlo, monospace; color: var(--muted); }

        .body { min-height: 20px; }
        .gist {
          font: 400 15.5px/1.42 "Iowan Old Style", Charter, Georgia, serif;
          letter-spacing: -.005em;
        }
        .detail {
          margin-top: 7px;
          font: 400 12.5px/1.55 "Iowan Old Style", Charter, Georgia, serif;
          color: #3B424D;
        }

        .streaming .body::after {
          content: "";
          display: inline-block; width: 6px; height: 13px;
          margin-left: 2px; vertical-align: -2px;
          background: var(--accent);
          animation: blink 1s steps(2) infinite;
        }
        .streaming .body:empty::before {
          content: "reading";
          font: 400 9.5px/1 ui-monospace, Menlo, monospace;
          letter-spacing: .14em; text-transform: uppercase; color: var(--muted);
        }

        .settings {
          margin-top: 9px; padding: 5px 9px;
          font: 500 10px/1 ui-monospace, Menlo, monospace;
          letter-spacing: .06em; text-transform: uppercase;
          background: var(--ink); color: var(--paper);
          border: 0; border-radius: 2px; cursor: pointer;
        }
        .settings:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }

        @keyframes swipe { from { transform: scaleX(0); } to { transform: scaleX(1); } }
        @keyframes drop { from { transform: scaleY(0); } to { transform: scaleY(1); } }
        @keyframes rise { from { opacity: 0; transform: translateY(-4px); } }
        .card.flip { animation-name: rise-flip; }
        @keyframes rise-flip {
          from { opacity: 0; transform: translateY(calc(-100% - 4px)); }
          to { opacity: 1; transform: translateY(-100%); }
        }
        @keyframes blink { 50% { opacity: 0; } }

        @media (prefers-reduced-motion: reduce) {
          .marker, .tether, .card { animation: none; }
          .streaming .body::after { animation: none; }
        }

        @media (prefers-color-scheme: dark) {
          .card {
            --ink: #ECEAE4; --paper: #171A20; --rule: #2C313A; --muted: #8B909B;
            box-shadow: 0 8px 28px -6px rgba(0,0,0,.5);
          }
          .detail { color: #B9BDC6; }
          .marker { opacity: .28; }
          .tether { background: #3A404B; }
        }
      </style>

      <div class="marker-layer"></div>
      <div class="tether"></div>
      <div class="card streaming">
        <div class="head">
          <span class="label">gloss <b>/</b> explain</span>
          <span class="meta"></span>
        </div>
        <div class="body"></div>
      </div>
    `;
  }
})();
