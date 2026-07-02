const DEV = false;
const log = (...args) => DEV && console.log('[UB]', ...args);

function injectBlockingStyles() {
  if (document.getElementById("ub-styles")) return;

  const style = document.createElement("style");
  style.id = "ub-styles";
  style.textContent = window.UBSite?.styles || "";
  document.head?.appendChild(style);

  const observer = new MutationObserver(() => window.UBSite?.onMutation?.());
  observer.observe(document.documentElement, { childList: true, subtree: true });
  window.__ubObserver = observer;

  window.UBSite?.enable?.();
  log("Active.");
}

function removeBlockingStyles() {
  document.getElementById("ub-styles")?.remove();
  window.__ubObserver?.disconnect();
  window.__ubObserver = null;
  window.UBSite?.disable?.();
  log("Disabled.");
}

const currentHost = window.location.hostname;

chrome.storage.local.get(["blockedSites"], (result) => {
  const blockedSites = result.blockedSites || [];
  if (blockedSites.includes(currentHost)) injectBlockingStyles();
});

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.action === "enable") { injectBlockingStyles(); sendResponse({ status: "enabled" }); }
  if (message.action === "disable") { removeBlockingStyles(); sendResponse({ status: "disabled" }); }
});