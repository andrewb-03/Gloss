const keyEl = document.getElementById("key");
const modelEl = document.getElementById("model");
const statusEl = document.getElementById("status");

chrome.storage.local.get(["apiKey", "model"]).then(({ apiKey, model }) => {
  if (apiKey) keyEl.value = apiKey;
  if (model) modelEl.value = model;
});

document.getElementById("save").addEventListener("click", async () => {
  const apiKey = keyEl.value.trim();
  if (apiKey && !apiKey.startsWith("sk-ant-")) {
    return flash("That doesn't look like an Anthropic key.");
  }
  await chrome.storage.local.set({ apiKey, model: modelEl.value });
  await chrome.storage.session.clear(); // model changed — old explanations no longer apply
  flash("Saved.");
});

keyEl.addEventListener("keydown", (e) => {
  if (e.key === "Enter") document.getElementById("save").click();
});

function flash(msg) {
  statusEl.textContent = msg;
  setTimeout(() => (statusEl.textContent = ""), 2400);
}
