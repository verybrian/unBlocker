const mainToggle = document.getElementById('main-toggle');
const statusLabel = document.getElementById('status-label');
const statusDot = document.getElementById('status-dot');
const hostnameEl = document.getElementById('hostname');
const footerHost = document.getElementById('footer-host');

let currentHost = '';
let blockedSites = [];
let filters = { ads: true, paywall: true, comments: false, cookies: false, newsletters: false };

chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
  const url = new URL(tabs[0].url);
  currentHost = url.hostname;
  hostnameEl.textContent = currentHost;
  footerHost.textContent = currentHost;

  chrome.storage.local.get(['blockedSites', 'filters'], (result) => {
    blockedSites = result.blockedSites || [];
    if (result.filters) filters = { ...filters, ...result.filters };

    const isOn = blockedSites.includes(currentHost);
    setMainToggle(isOn);
    syncFilterToggles();
  });
});

mainToggle.addEventListener('click', () => {
  const isOn = blockedSites.includes(currentHost);
  if (isOn) {
    blockedSites = blockedSites.filter(s => s !== currentHost);
    sendToTab('disable');
  } else {
    blockedSites.push(currentHost);
    sendToTab('enable');
  }
  chrome.storage.local.set({ blockedSites });
  setMainToggle(!isOn);
});

function setMainToggle(on) {
  mainToggle.classList.toggle('on', on);
  statusLabel.textContent = on ? 'unBlocker is on' : 'unBlocker is off';
  statusLabel.classList.toggle('on', on);
  statusDot.classList.toggle('on', on);
}

document.querySelectorAll('.mini-toggle').forEach(btn => {
  btn.addEventListener('click', () => {
    const filter = btn.dataset.filter;
    filters[filter] = !filters[filter];
    btn.classList.toggle('on', filters[filter]);
    chrome.storage.local.set({ filters });
    sendToTab('updateFilters', { filters });
  });
});

function syncFilterToggles() {
  document.querySelectorAll('.mini-toggle').forEach(btn => {
    const filter = btn.dataset.filter;
    btn.classList.toggle('on', !!filters[filter]);
  });
}

document.querySelectorAll('.tab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
    tab.classList.add('active');
    document.getElementById('tab-' + tab.dataset.tab).classList.add('active');
  });
});

function sendToTab(action, extra = {}) {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    chrome.tabs.sendMessage(tabs[0].id, { action, ...extra });
  });
}