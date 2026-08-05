window.UBSite = {

  styles: `
    #paywall { display: none !important; }
    .spinner { display: none !important; }
    div.nmgp.content-page-ad_wrap { display: none !important; }
    .paragraph-wrapper.nmgp { display: block !important; }
  `,

  _nmgpObserver: null,

  enable() {
    this._startNmgpGuard();
    this._fetchAndInject(window.location.href);
    chrome.storage.local.get(['filters'], (result) => {
      if (result.filters) {
        this.applyFilters(result.filters);
      }
    });
  },

  disable() {
    this._stopNmgpGuard();
    const paywall = document.querySelector('#paywall');
    if (paywall) {
      paywall.style.display = '';
    }
    const newsletter = document.querySelector('#newsletter_signup');
    if (newsletter) {
      newsletter.style.display = '';
    }
  },

  onMutation() {
    const paywall = document.querySelector('#paywall');
    const textBlock = document.querySelector('.text-block.blk-txt');
    
    if (paywall && textBlock && !textBlock.querySelector('.paragraph-wrapper')) {
      this._fetchAndInject(window.location.href);
    }
    
    chrome.storage.local.get(['filters'], (result) => {
      if (result.filters) {
        this.applyFilters(result.filters);
      }
    });
  },

  _startNmgpGuard() {
    if (this._nmgpObserver) return;
    
    const stripNmgp = () => {
      document.querySelectorAll('.paragraph-wrapper.nmgp').forEach(el => {
        if (!el.querySelector('.content-page-ad')) {
          el.classList.remove('nmgp');
        }
      });
    };
    
    stripNmgp();
    
    this._nmgpObserver = new MutationObserver(() => {
      stripNmgp();
    });
    
    this._nmgpObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class'],
      subtree: true
    });
  },

  _stopNmgpGuard() {
    if (this._nmgpObserver) {
      this._nmgpObserver.disconnect();
      this._nmgpObserver = null;
    }
  },

  applyFilters(filters) {
    if (filters.comments) {
      this._hideComments();
    } else {
      this._showComments();
    }
    
    if (filters.ads) {
      this._hideAds();
    }
    
    if (filters.paywall) {
      this._hidePaywall();
    }
    
    if (filters.newsletters) {
      this._hideNewsletters();
    } else {
      this._showNewsletters();
    }
  },

  _hideNewsletters() {
    const el = document.querySelector('#newsletter_signup');
    if (el) {
      el.style.display = 'none';
    }
  },

  _showNewsletters() {
    const el = document.querySelector('#newsletter_signup');
    if (el) {
      el.style.display = '';
    }
  },

  _hideComments() {
    const selectors = [
      '#layout[data-tracking-area="layout"]',
      '#thread__container',
      '#conversation',
      '#posts',
      '#reactions__container',
      '#ratings__container',
      '#main-nav',
      '#footer.disqus-footer__wrapper'
    ];
    
    selectors.forEach(selector => {
      document.querySelectorAll(selector).forEach(el => {
        el.style.display = 'none';
      });
    });
    
    const disqusThread = document.querySelector('#disqus_thread');
    if (disqusThread) {
      disqusThread.style.display = 'none';
    }
  },

  _showComments() {
    const selectors = [
      '#layout[data-tracking-area="layout"]',
      '#thread__container',
      '#conversation',
      '#posts',
      '#reactions__container',
      '#ratings__container',
      '#main-nav',
      '#footer.disqus-footer__wrapper'
    ];
    
    selectors.forEach(selector => {
      document.querySelectorAll(selector).forEach(el => {
        el.style.display = '';
      });
    });
    
    const disqusThread = document.querySelector('#disqus_thread');
    if (disqusThread) {
      disqusThread.style.display = '';
    }
  },

  _hideAds() {
    const adSelectors = [
      'div.nmgp.content-page-ad_wrap',
      '[data-role="ad-wrapper"]',
      '.content-page-ad',
      '.wallAd',
      '.article-content-related'
    ];
    
    adSelectors.forEach(selector => {
      document.querySelectorAll(selector).forEach(el => {
        el.style.display = 'none';
      });
    });
  },

  _hidePaywall() {
    document.querySelectorAll('#paywall').forEach(el => {
      el.style.display = 'none';
    });
  },

  _waitForContainer(callback) {
    const existing = document.querySelector(".text-block.blk-txt");
    if (existing) {
      callback(existing);
      return;
    }

    const observer = new MutationObserver(() => {
      const el = document.querySelector(".text-block.blk-txt");
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
      const paragraphs = doc.querySelectorAll(".text-block.blk-txt .paragraph-wrapper");
      
      if (!paragraphs.length) {
        const altParagraphs = doc.querySelectorAll(".paragraph-wrapper, .text-block.blk-txt p");
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
      
      paragraphs.forEach(p => {
        const clone = p.cloneNode(true);
        
        if (clone.classList.contains('content-page-ad_wrap') || 
            clone.classList.contains('article-content-related') ||
            clone.id === 'newsletter_signup' ||
            clone.classList.contains('nmgp') && clone.querySelector('.content-page-ad')) {
          return;
        }
        
        clone.classList.remove("nmgp");
        textBlock.appendChild(clone);
      });
      
      this._fixImageUrls(textBlock, url);
      this._hidePaywallElements();
    });
  }
};

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'enable') {
    window.UBSite.enable();
  } else if (request.action === 'disable') {
    window.UBSite.disable();
  } else if (request.action === 'updateFilters') {
    window.UBSite.applyFilters(request.filters);
  }
  
  sendResponse({ success: true });
});