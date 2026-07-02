window.UBSite = {

  styles: `.spw-wrap { display: none !important; }`,

  enable() {
    this._injectArticleBody();
  },

  disable() {
    document.getElementById("ub-standard-content")?.remove();
  },

  onMutation() { },

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

      if (!articleBody) { log("Standard: articleBody not found."); return; }

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
      log("Standard: injected.");
    };

    attempt();
  }
};