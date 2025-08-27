// === Configure your targets here ===
const blockedSites = [
  "instagram.com",
  "twitter.com" ,
  "discord.com",
  "vlr.gg",
  "twitch.tv", 
  "music.youtube.com",
];

// --- helpers ---
function parseUrl(u) {
  try { return new URL(u); } catch { return null; }
}
function hostMatchesSite(url, site) {
  const u = parseUrl(url);
  if (!u) return false;
  const h = u.hostname.toLowerCase();
  const s = site.toLowerCase();
  return h === s || h.endsWith("." + s);
}

// Map the last matched site per tab (so we clean only that site on close)
const tabSite = new Map();

// Track visits to blocked sites and remember which site the tab belongs to
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (!tab || !tab.url || changeInfo.status !== "complete") return;
  const matched = blockedSites.find(site => hostMatchesSite(tab.url, site));
  if (matched) {
    tabSite.set(tabId, matched);
    // (Optional) console.log("Tracking tab", tabId, "for", matched, tab.url);
  }
});

// When a tracked tab closes, sweep that domain
chrome.tabs.onRemoved.addListener(async (tabId) => {
  const site = tabSite.get(tabId);
  if (!site) return;
  tabSite.delete(tabId);
  await sweepSite(site);
});

// Delete a single URL if it belongs to a blocked site
async function deleteIfBlocked(url) {
  for (const site of blockedSites) {
    if (hostMatchesSite(url, site)) {
      try { await chrome.history.deleteUrl({ url }); } catch (e) { /* ignore */ }
      break;
    }
  }
}

// Immediate, targeted cleanup: whenever a history item is created, nuke it if it’s for a blocked site
chrome.history.onVisited.addListener(async (result) => {
  if (!result || !result.url) return;
  await deleteIfBlocked(result.url);
});

// Full sweep for a given site (domain + all subpaths)
async function sweepSite(site) {
  try {
    // Pull a big batch and then filter by hostname to avoid false positives
    const results = await chrome.history.search({
      text: site,
      startTime: 0,
      maxResults: 50000  // bump if you need more
    });

    for (const item of results) {
      if (item.url && hostMatchesSite(item.url, site)) {
        try {
          await chrome.history.deleteUrl({ url: item.url });
        } catch (e) {
          // (Optional) console.warn("Delete failed for", item.url, e);
        }
      }
    }
  } catch (err) {
    // (Optional) console.error("Sweep error for", site, err);
  }
}

// Periodic safety sweep to catch late/synced entries (targeted only)
chrome.runtime.onInstalled.addListener(() => {
  chrome.alarms.create("autoHistoryCleaner_sweep", { periodInMinutes: 1 });
});
chrome.runtime.onStartup.addListener(() => {
  chrome.alarms.create("autoHistoryCleaner_sweep", { periodInMinutes: 1 });
});
chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name !== "autoHistoryCleaner_sweep") return;
  for (const site of blockedSites) {
    await sweepSite(site);
  }
});
