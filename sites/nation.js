window.UBSite = {

  styles: `
    div.nmgp.content-page-ad_wrap { display: none !important; }
    #paywall { display: none !important; }
  `,

  enable() {
    this._applyClassRemovals();
    this._fetchAndInject(window.location.href);
  },

  disable() {},

  onMutation() {
    this._applyClassRemovals();
  },

  _classRemovals: [
    { target: "#container-1", classes: ["hidden"] },
    { target: "#container-2", classes: ["hidden"] }
  ],

  _applyClassRemovals() {
    this._classRemovals.forEach(({ target, classes }) => {
      const el = document.querySelector(target);
      if (!el) return;
      el.classList.remove(...classes);
    });
  },

  _waitForContainer(callback) {
    const existing = document.querySelector("#container-2 .text-block.blk-txt");
    if (existing) { callback(existing); return; }

    const observer = new MutationObserver(() => {
      const el = document.querySelector("#container-2 .text-block.blk-txt");
      if (el) { observer.disconnect(); callback(el); }
    });
    observer.observe(document.documentElement, { childList: true, subtree: true });
  },

  _fixImageUrls(container, baseUrl) {
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
      img.closest(".lazy-img-container")?.style.setProperty("opacity", "1");
    });
  },

  _hidePaywallChrome() {
    [".spinner", "#article-general-spinner", ".wall-guard", "[class*='wall-guard']"]
      .forEach(sel => document.querySelectorAll(sel)
      .forEach(el => el.style.display = "none"));
  },

  _fetchAndInject(url) {
    chrome.runtime.sendMessage({ action: "fetchArticle", url }, (response) => {
      if (!response?.ok || !response.html) return;

      const parser = new DOMParser();
      const doc = parser.parseFromString(response.html, "text/html");
      const paragraphs = doc.querySelectorAll("#container-2 .text-block.blk-txt .paragraph-wrapper");

      if (!paragraphs.length) return;

      this._waitForContainer((container) => {
        setTimeout(() => {
          container.innerHTML = "";
          paragraphs.forEach(p => {
            const clone = p.cloneNode(true);
            clone.classList.remove("nmgp");
            container.appendChild(clone);
          });
          this._fixImageUrls(container, url);
          this._hidePaywallChrome();
        }, 1500);
      });
    });
  }
};