window.UBSite = {

  styles: `.spw-wrap { display: none !important; }`,

  enable() {
    this._injectArticleBody();
  },

  disable() {
    document.getElementById("ub-standard-content")?.remove();
  },

  onMutation() {},

  _injectArticleBody() {
    const blocks = document.querySelectorAll('script[type="application/ld+json"]');
    let articleBody = null;

    for (const block of blocks) {
      const match = block.textContent.match(/"articleBody"\s*:\s*"([\s\S]*?)"\s*,\s*"image"/);
      if (match) { articleBody = match[1]; break; }
    }

    if (!articleBody) { log("Standard: articleBody not found."); return; }

    const container = document.querySelector('.paywall')?.closest('.col-12.col-md-8');
    if (!container) { log("Standard: container not found."); return; }

    const paragraphs = articleBody.split(/\n+/).map(s => s.trim()).filter(Boolean);

    const wrapper = document.createElement("div");
    wrapper.id = "ub-standard-content";
    wrapper.style.cssText = "margin-top: 16px; line-height: 1.8; font-size: 1rem;";

    paragraphs.forEach(text => {
      const p = document.createElement("p");
      p.textContent = text;
      p.style.marginBottom = "1rem";
      wrapper.appendChild(p);
    });

    container.appendChild(wrapper);
  }
};