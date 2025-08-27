const siteInput = document.getElementById("siteInput");
const addBtn = document.getElementById("addBtn");
const siteList = document.getElementById("siteList");

function renderList(sites) {
  siteList.innerHTML = "";
  sites.forEach((site, index) => {
    const li = document.createElement("li");
    li.textContent = site;

    const remove = document.createElement("span");
    remove.textContent = "✖";
    remove.className = "remove";
    remove.onclick = () => {
      sites.splice(index, 1);
      chrome.storage.local.set({ blockedSites: sites }, () => {
        renderList(sites);
      });
    };

    li.appendChild(remove);
    siteList.appendChild(li);
  });
}

addBtn.onclick = () => {
  const site = siteInput.value.trim();
  if (!site) return;

  chrome.storage.local.get({ blockedSites: [] }, (data) => {
    if (!data.blockedSites.includes(site)) {
      data.blockedSites.push(site);
      chrome.storage.local.set({ blockedSites: data.blockedSites }, () => {
        renderList(data.blockedSites);
        siteInput.value = "";
      });
    }
  });
};

// Load current list
chrome.storage.local.get({ blockedSites: [] }, (data) => {
  renderList(data.blockedSites);
});
