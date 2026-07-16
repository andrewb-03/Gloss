# Privacy Policy — Gloss

Last updated: July 2026

Gloss is a browser extension that explains text you highlight. This policy describes exactly what it handles and where that data goes.

## What Gloss stores

**Your Anthropic API key.** Saved in `chrome.storage.local` on your own machine when you enter it in settings. It is not synced across devices, not transmitted anywhere except to Anthropic's API as the authentication header on your own requests, and not visible to the developer.

**Cached explanations.** When you request an explanation, the result is cached in `chrome.storage.session`, keyed by a hash of the selected text and the page title. This cache exists only for the current browser session and is discarded when you close the browser.

Nothing else is stored.

## What Gloss transmits

When — and only when — you explicitly request an explanation via the context menu or keyboard shortcut, Gloss sends the following to `https://api.anthropic.com`:

- The text you selected
- The title of the page you selected it on
- Up to roughly 700 characters of text surrounding your selection, used so the model can tell which sense of a word you mean

That request goes directly from your browser to Anthropic. It does not pass through any server operated by the developer, because there is no such server. Anthropic's handling of that data is governed by their own privacy policy and the terms attached to your API key.

## What Gloss does not do

- No analytics, telemetry, tracking, or crash reporting.
- No advertising, and no data sold or shared with third parties.
- No background reading of pages. Gloss reads a selection only in response to a deliberate action by you.
- No developer-operated backend. The extension is entirely client-side.
- No collection of browsing history, personal identifiers, location, or financial information.

## Permissions and why they exist

| Permission | Why |
|---|---|
| `contextMenus` | Adds the "Explain" item to the right-click menu |
| `storage` | Saves your API key locally and caches explanations for the session |
| `activeTab` | Reads the text you selected on the tab you're currently using |
| `host_permissions: api.anthropic.com` | Sends your explanation request to Anthropic |

The content script runs on all URLs so the shortcut works on any page, but it stays inert until you invoke it.

## Removing your data

Clearing the API key field in settings and saving removes it. Uninstalling Gloss removes everything it stored. Closing the browser clears the session cache.

## Contact

Questions about this policy: open an issue at https://github.com/andrewb-03/Gloss/issues
