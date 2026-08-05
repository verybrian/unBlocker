window.UBSite = {

  styles: `
    div.nmgp.content-page-ad_wrap { display: none !important; }
    #paywall { display: none !important; }
  `,

  enable() {
    this._showArticleTab();
    this._fetchAndInject(window.location.href);
  },

  disable() {},

  onMutation() {
    this._showArticleTab();
  },

  _showArticleTab() {
    const articleTab = document.querySelector('#story');
    const relatedTab = document.querySelector('#related');
    const container1 = document.querySelector('#container-1');
    const container2 = document.querySelector('#container-2');
    
    if (articleTab && container1 && container2) {
      articleTab.classList.add('active-tab');
      relatedTab.classList.remove('active-tab');
      
      container1.classList.remove('hidden');
      container2.classList.add('hidden');
    }
  },

  _waitForContainer(callback) {
    const existing = document.querySelector("#container-1 .text-block.blk-txt");
    if (existing) {
      callback(existing);
      return;
    }

    const observer = new MutationObserver(() => {
      const el = document.querySelector("#container-1 .text-block.blk-txt");
      if (el) {
        observer.disconnect();
        callback(el);
      }
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

  _hidePaywallElements() {
    const selectors = [
      ".premium-content", 
      ".paywall-overlay", 
      ".wall-guard", 
      "[class*='wall-guard']",
      ".articles-left-notifier",
      ".promotion-banner"
    ];
    
    selectors.forEach(sel => {
      document.querySelectorAll(sel).forEach(el => {
        el.style.display = "none";
      });
    });
  },

  _fetchAndInject(url) {
    chrome.runtime.sendMessage({ action: "fetchArticle", url }, (response) => {
      if (!response?.ok || !response.html) {
        return;
      }

      const parser = new DOMParser();
      const doc = parser.parseFromString(response.html, "text/html");
      const paragraphs = doc.querySelectorAll("#container-1 .text-block.blk-txt .paragraph-wrapper");
      
      if (!paragraphs.length) {
        const altParagraphs = doc.querySelectorAll("#container-1 .paragraph-wrapper, #container-1 p");
        if (!altParagraphs.length) {
          return;
        }
        
        this._injectContent(altParagraphs, url);
        return;
      }

      this._injectContent(paragraphs, url);
    });
  },

  _injectContent(paragraphs, url) {
    this._waitForContainer((textBlock) => {
      textBlock.innerHTML = "";
      
      let injectedCount = 0;
      paragraphs.forEach(p => {
        const clone = p.cloneNode(true);
        
        if (clone.classList.contains('content-page-ad_wrap') || 
            clone.classList.contains('nmgp') && clone.querySelector('.content-page-ad')) {
          return;
        }
        
        clone.classList.remove("nmgp");
        textBlock.appendChild(clone);
        injectedCount++;
      });
      
      this._fixImageUrls(textBlock.closest('#container-1'), url);
      this._hidePaywallElements();
      this._showArticleTab();
    });
  }
};