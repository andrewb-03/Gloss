# Chrome Web Store submission — Gloss

Copy-paste answers for the developer dashboard. The justification fields are where most first submissions get rejected; these are written the way reviewers want them — one concrete sentence tying the permission to a user-visible feature.

---

## Listing

**Name**
Gloss — explain this

**Summary** (132 char max)
Highlight any text on any page and get a plain-English explanation right where you're reading. Bring your own Anthropic API key.

**Category**
Productivity

**Language**
English (United States)

**Description**

```
Gloss explains what you're reading, without making you leave what you're reading.

Highlight any word, phrase, or passage on any page. Right-click and choose Explain, or press Cmd+Shift+E. A small card appears next to your selection with a plain-English explanation — the gist in one sentence, then a little detail if it helps.

No sidebar. No new tab. No copying text into a chat window and losing your place.

WHAT IT'S GOOD FOR
• Dense technical documentation and API references
• Legal and financial language that's deliberately unclear
• Papers and articles outside your field
• Jargon, acronyms, and terms of art
• Anything you'd otherwise have opened a new tab to look up

HOW IT WORKS
Gloss reads your selection plus a little surrounding text, so it can tell which sense of a word you mean — "bearing" in a mechanical drawing is not "bearing" in a legal filing. The explanation streams in as it's generated, so you start reading immediately.

BRING YOUR OWN KEY
Gloss uses your own Anthropic API key, which you enter once in settings. This means:
• There is no server between you and the API
• There is no subscription, and no markup on what you use
• Your key stays in your browser and is never sent to the developer
• Typical explanations cost a fraction of a cent

Get a key at console.anthropic.com.

PRIVACY
Gloss has no analytics, no telemetry, and no backend. It reads a selection only when you explicitly ask it to. Full policy: https://github.com/andrewb-03/Gloss/blob/main/PRIVACY.md

Open source, MIT licensed: https://github.com/andrewb-03/Gloss
```

**Homepage URL**
https://github.com/andrewb-03/Gloss

**Privacy policy URL**
https://github.com/andrewb-03/Gloss/blob/main/PRIVACY.md

---

## Privacy practices tab

**Single purpose description**
```
Gloss has one purpose: to explain text the user highlights on a web page, displaying the explanation in place next to the selection. Every permission it requests exists to serve that single function.
```

**Permission justifications**

`contextMenus`
```
Adds a single "Explain" item to the right-click menu, shown only when text is selected. This is the primary way users invoke the extension.
```

`storage`
```
Stores the user's own Anthropic API key locally so they don't re-enter it every time, and caches explanations for the current browser session so repeating a lookup on the same page is instant and doesn't bill the user twice.
```

`activeTab`
```
Reads the text the user has selected on the current tab, which is the input the extension exists to explain. Accessed only in response to the user clicking the context menu item or pressing the keyboard shortcut.
```

`host_permissions` — `https://api.anthropic.com/*`
```
The extension sends the user's selected text to Anthropic's API to generate the explanation, authenticated with the user's own API key. This is the only host the extension contacts, and it operates no server of its own.
```

**Content script on `<all_urls>` justification**
```
Users need to explain text on arbitrary pages, so the content script must be available anywhere. It stays inert and does nothing until the user explicitly invokes an explanation; it does not read, monitor, or transmit page content otherwise.
```

**Remote code**
Answer: **No, I am not using remote code.** All JavaScript is bundled in the package. The extension makes API calls that return text data, which is rendered as text — never evaluated.

**Data usage — check these boxes:**
- ☑ Authentication information ("user's own API key, stored locally, transmitted only to Anthropic")
- ☑ Website content ("the text the user selects, sent only on explicit user action")
- ☐ Everything else — leave unchecked

**Certifications — all three must be checked:**
- ☑ Not being sold to third parties, outside of approved use cases
- ☑ Not being used or transferred for purposes unrelated to the item's single purpose
- ☑ Not being used or transferred to determine creditworthiness or for lending purposes

---

## Assets to produce

**Store icon** — 128×128 PNG. Already have it: `icons/icon128.png`.

**Screenshots** — 1280×800 PNG, at least one, up to five. Suggested set:
1. Card open over a dense paragraph of technical docs — the money shot
2. Card open over a legal or financial passage — shows range
3. Settings page — shows BYOK is honest and simple
4. Card mid-stream with the cursor visible — shows it's live

Take these at 1280×800 exactly. Chrome will reject odd sizes. Use a page with clean typography so the card reads well against it.

**Promotional tile** (optional, 440×280) — skip for v1.

---

## Before you hit submit

- [ ] `version` in manifest.json is `1.0.0`, not `0.1.0` — reviewers read `0.x` as unfinished
- [ ] Zip the folder's *contents*, not the folder itself (no top-level `gloss/` directory inside the zip)
- [ ] `make_icons.py` and `.gitignore` excluded from the zip — source tooling doesn't belong in the package
- [ ] Registered as a developer ($5 one-time) at https://chrome.google.com/webstore/devconsole
- [ ] Loaded the exact zip you're submitting as unpacked, and confirmed it works

Review typically takes 1–3 business days for a first submission. Extensions requesting `<all_urls>` sometimes take longer and occasionally draw a clarifying question — the single-purpose statement above is what answers it.
