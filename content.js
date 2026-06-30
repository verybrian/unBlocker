const DEV = false;
const log = (...args) => DEV && console.log('[UB]', ...args);

const CLASS_REMOVALS = [
  { target: "#container-1", classes: ["hidden"] },
  { target: "#container-2", classes: ["hidden"] }
];

function applyClassRemovals() {
  CLASS_REMOVALS.forEach(({ target, classes }) => {
    const el = document.querySelector(target);
    if (!el) return;
    el.classList.remove(...classes);
  });
}

function waitForContainer(callback) {
  const existing = document.querySelector(".text-block.blk-txt");
  if (existing) { callback(existing); return; }

  const observer = new MutationObserver(() => {
    const el = document.querySelector(".text-block.blk-txt");
    if (el) { observer.disconnect(); callback(el); }
  });
  observer.observe(document.documentElement, { childList: true, subtree: true });
}

function fixImageUrls(container, baseUrl) {
  const origin = new URL(baseUrl).origin;
  container.querySelectorAll("img[data-lazy-img]").forEach(img => {
    const src = img.getAttribute("data-src");
    const srcset = img.getAttribute("data-srcset");

    if (src) img.src = src;
    if (srcset) {
      img.srcset = srcset.split(",").map(entry => {
        const [url, width] = entry.trim().split(/\s+/);
        const fixedUrl = url.startsWith("/") ? origin + url : url;
        return width ? `${fixedUrl} ${width}` : fixedUrl;
      }).join(", ");
    }

    img.removeAttribute("data-lazy-img");
    img.removeAttribute("loading");

    img.style.opacity = "1";
    const lazyContainer = img.closest(".lazy-img-container");
    if (lazyContainer) lazyContainer.style.opacity = "1";
  });
}

function hidePaywallChrome() {
  [".spinner", "#article-general-spinner", ".wall-guard", "[class*='wall-guard']"]
    .forEach(sel => {
      document.querySelectorAll(sel).forEach(el => el.style.display = "none");
    });
}

function fetchAndInject(url) {
  chrome.runtime.sendMessage({ action: "fetchArticle", url }, (response) => {
    if (!response?.ok || !response.html) {
      log("Fetch failed:", response?.error);
      return;
    }

    const parser = new DOMParser();
    const doc = parser.parseFromString(response.html, "text/html");
    const paragraphs = doc.querySelectorAll(".text-block.blk-txt .paragraph-wrapper");
    log(`Parsed ${paragraphs.length} paragraphs.`);

    if (!paragraphs.length) return;

    waitForContainer((container) => {
      setTimeout(() => {
        container.innerHTML = "";
        paragraphs.forEach(p => {
          const clone = p.cloneNode(true);
          clone.classList.remove("nmgp");
          container.appendChild(clone);
        });
        fixImageUrls(container, url);
        hidePaywallChrome();
        log("Injected.");
      }, 1500);
    });
  });
}

function injectBlockingStyles() {
  if (document.getElementById("ub-styles")) return;

  const style = document.createElement("style");
  style.id = "ub-styles";
  style.textContent = `
    div.nmgp.content-page-ad_wrap { display: none !important; }
    #paywall { display: none !important; }
  `;
  document.head?.appendChild(style);

  const observer = new MutationObserver(() => applyClassRemovals());
  observer.observe(document.documentElement, { childList: true, subtree: true });
  window.__ubObserver = observer;

  fetchAndInject(window.location.href);
  log("Active.");
}

function removeBlockingStyles() {
  document.getElementById("ub-styles")?.remove();
  window.__ubObserver?.disconnect();
  window.__ubObserver = null;
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