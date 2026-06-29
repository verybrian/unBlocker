chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.action !== "fetchArticle") return;

  fetch(message.url, { credentials: "omit" })
    .then(res => res.text())
    .then(html => sendResponse({ ok: true, html }))
    .catch(err => sendResponse({ ok: false, error: err.message }));

  return true;
});
