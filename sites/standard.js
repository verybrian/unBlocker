window.UBSite = {

  styles: `
    .spw-wrap { display: none !important; }
    #tbl-explore-more-container { display: none !important; }
    body.tbl-show-explore-more.tbl-explore-more-has-overlay::before {
      display: none !important;
    }
    body.tbl-show-explore-more {
      overflow: auto !important;
      position: static !important;
      pointer-events: auto !important;
    }
    body.tbl-show-explore-more.tbl-explore-more-has-overlay {
      overflow: auto !important;
      position: static !important;
      pointer-events: auto !important;
    }
  `,

  enable() {
    this._injectArticleBody();
    chrome.storage.local.get(['filters'], (result) => {
      if (result.filters) {
        this.applyFilters(result.filters);
      }
    });
  },

  disable() {
    document.getElementById("ub-standard-content")?.remove();
    const exploreMore = document.querySelector('#tbl-explore-more-container');
    if (exploreMore) {
      exploreMore.style.display = '';
    }
    document.body.classList.remove('tbl-show-explore-more', 'tbl-explore-more-has-overlay');
    document.body.style.overflow = '';
    document.body.style.position = '';
    document.body.style.pointerEvents = '';
  },

  onMutation() {
    chrome.storage.local.get(['filters'], (result) => {
      if (result.filters) {
        this.applyFilters(result.filters);
      }
    });
  },

  applyFilters(filters) {
    if (filters.ads) {
      this._hideAds();
      this._removeBodyLock();
    }
    
    if (filters.comments) {
      this._hideComments();
    }
  },

  _hideAds() {
    const selectors = [
      '#tbl-explore-more-container',
      '[id*="tbl-explore-more"]',
      '.tbl-explore-more-overlay',
      '[role="dialog"][aria-label*="Keep on reading"]',
      '[aria-labelledby="tbl-explore-more-title"]'
    ];
    
    selectors.forEach(selector => {
      document.querySelectorAll(selector).forEach(el => {
        el.style.display = 'none';
      });
    });
  },

  _removeBodyLock() {
    document.body.classList.remove('tbl-show-explore-more', 'tbl-explore-more-has-overlay');
    document.body.style.overflow = 'auto';
    document.body.style.position = 'static';
    document.body.style.pointerEvents = 'auto';
  },

  _hideComments() {},

  _injectArticleBody() {
    function decodeEntities(str) {
      let decoded = str;
      let previous;
      do {
        previous = decoded;
        const txt = document.createElement("textarea");
        txt.innerHTML = previous;
        decoded = txt.value;
      } while (decoded !== previous);
      return decoded;
    }

    const attempt = () => {
      const spwWrap = document.querySelector('.spw-wrap');
      const blocks = document.querySelectorAll('script[type="application/ld+json"]');

      if (!spwWrap || !blocks.length) {
        setTimeout(attempt, 300);
        return;
      }

      if (document.getElementById("ub-standard-content")) return;

      let articleBody = null;
      for (const block of blocks) {
        const match = block.textContent.match(/"articleBody"\s*:\s*"([\s\S]*?)"\s*,\s*"image"/);
        if (match) { articleBody = match[1]; break; }
      }

      if (!articleBody) return;

      const paragraphs = articleBody.split(/\n+/).map(s => s.trim()).filter(Boolean);

      const wrapper = document.createElement("div");
      wrapper.id = "ub-standard-content";
      wrapper.style.cssText = "margin-top: 16px; line-height: 1.8; font-size: 1rem;";

      paragraphs.forEach(text => {
        const p = document.createElement("p");
        p.textContent = decodeEntities(text);
        p.style.marginBottom = "1rem";
        wrapper.appendChild(p);
      });

      spwWrap.parentElement.insertBefore(wrapper, spwWrap);
    };

    attempt();
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