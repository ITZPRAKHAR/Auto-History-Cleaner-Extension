let blockedSites = [];
const trackedTabs = new Set();

// Load blocked sites on start
chrome.storage.local.get({ blockedSites: [] }, (data) => {
  blockedSites = data.blockedSites;
});


// Update whenever changed
chrome.storage.onChanged.addListener((changes) => {
  if (changes.blockedSites) {
    blockedSites = changes.blockedSites.newValue;
    console.log("Updated blocked sites:", blockedSites);
  }
});

// --- Helpers ---
function parseUrl(u) { try { return new URL(u); } catch { return null; } }
function hostMatchesSite(url, site) {
  const u = parseUrl(url); if (!u) return false;
  const h = u.hostname.toLowerCase(), s = site.toLowerCase();
  return h === s || h.endsWith("." + s);
}

// Track tabs
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === "complete" && tab.url) {
    if (blockedSites.some(site => hostMatchesSite(tab.url, site))) {
      trackedTabs.add(tabId);
    }
  }
});

// When tab closes, sweep that domain
chrome.tabs.onRemoved.addListener(async (tabId) => {
  if (!trackedTabs.has(tabId)) return;
  trackedTabs.delete(tabId);

  for (const site of blockedSites) {
    const results = await chrome.history.search({ text: site, startTime: 0, maxResults: 5000 });
    for (const item of results) {
      if (item.url && hostMatchesSite(item.url, site)) {
        await chrome.history.deleteUrl({ url: item.url });
      }
    }
  }
});

// Immediate cleanup for new entries (optional)
chrome.history.onVisited.addListener(async (result) => {
  if (!result || !result.url) return;
  for (const site of blockedSites) {
    if (hostMatchesSite(result.url, site)) {
      await chrome.history.deleteUrl({ url: result.url });
      break;
    }
  }
});

// Periodic safety sweep
chrome.runtime.onInstalled.addListener(() => {
  chrome.alarms.create("sweep", { periodInMinutes: 1 });
});
chrome.runtime.onStartup.addListener(() => {
  chrome.alarms.create("sweep", { periodInMinutes: 1 });
});
chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name !== "sweep") return;
  for (const site of blockedSites) {
    const results = await chrome.history.search({ text: site, startTime: 0, maxResults: 5000 });
    for (const item of results) {
      if (item.url && hostMatchesSite(item.url, site)) {
        await chrome.history.deleteUrl({ url: item.url });
      }
    }
  }
});

// CREATED WITH ❤️ BY PRAKHAR SINGH
// GITHUB: https://github.com/ITZPRAKHAR
// DATE - 25 JULY 2025