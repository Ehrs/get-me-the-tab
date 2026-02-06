let currentWindowId;
let allTabs = [];
let filteredTabs = [];
let selectedIndex = 0;

const searchInput = document.getElementById("search");
const tabList = document.getElementById("tab-list");

async function init() {
  const currentWindow = await chrome.windows.getCurrent();
  currentWindowId = currentWindow.id;

  const tabs = await chrome.tabs.query({});
  allTabs = tabs.sort((a, b) => {
    const aCurrent = a.windowId === currentWindowId ? 0 : 1;
    const bCurrent = b.windowId === currentWindowId ? 0 : 1;
    if (aCurrent !== bCurrent) return aCurrent - bCurrent;
    if (a.windowId !== b.windowId) return a.windowId - b.windowId;
    return a.index - b.index;
  });

  filteredTabs = allTabs;
  render();
}

function render() {
  tabList.innerHTML = "";
  filteredTabs.forEach((tab, i) => {
    const li = document.createElement("li");
    li.className = "tab-item" + (i === selectedIndex ? " selected" : "");

    const img = document.createElement("img");
    img.src = tab.favIconUrl || "chrome://favicon/size/16/" + (tab.url || "");
    img.alt = "";
    li.appendChild(img);

    const info = document.createElement("div");
    info.className = "tab-info";

    const title = document.createElement("div");
    title.className = "tab-title";
    title.textContent = tab.title || "Untitled";
    info.appendChild(title);

    const url = document.createElement("div");
    url.className = "tab-url";
    url.textContent = tab.url || "";
    info.appendChild(url);

    li.appendChild(info);

    if (tab.windowId !== currentWindowId) {
      const badge = document.createElement("span");
      badge.className = "tab-window-badge";
      badge.textContent = "Window";
      li.appendChild(badge);
    }

    const closeBtn = document.createElement("button");
    closeBtn.className = "tab-close";
    closeBtn.textContent = "×";
    closeBtn.title = "Close tab";
    closeBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      closeTab(tab);
    });
    li.appendChild(closeBtn);

    li.addEventListener("click", (e) => {
      if (e.metaKey || e.ctrlKey) {
        moveTabToCurrent(tab);
      } else {
        switchToTab(tab);
      }
    });

    tabList.appendChild(li);
  });
}

function filter() {
  const query = searchInput.value.toLowerCase();
  if (!query) {
    filteredTabs = allTabs;
  } else {
    filteredTabs = allTabs.filter((tab) => {
      const haystack = ((tab.title || "") + " " + (tab.url || "")).toLowerCase();
      return haystack.includes(query);
    });
  }
  selectedIndex = 0;
  render();
}

async function switchToTab(tab) {
  await chrome.tabs.update(tab.id, { active: true });
  await chrome.windows.update(tab.windowId, { focused: true });
  window.close();
}

async function moveTabToCurrent(tab) {
  if (tab.windowId === currentWindowId) {
    await chrome.tabs.update(tab.id, { active: true });
    window.close();
    return;
  }
  try {
    await chrome.tabs.move(tab.id, { windowId: currentWindowId, index: -1 });
    await chrome.tabs.update(tab.id, { active: true });
    await chrome.windows.update(currentWindowId, { focused: true });
    window.close();
  } catch {
    switchToTab(tab);
  }
}

async function closeTab(tab) {
  try {
    await chrome.tabs.remove(tab.id);
  } catch {
    return;
  }
  allTabs = allTabs.filter((t) => t.id !== tab.id);
  filteredTabs = filteredTabs.filter((t) => t.id !== tab.id);
  if (selectedIndex >= filteredTabs.length) {
    selectedIndex = Math.max(0, filteredTabs.length - 1);
  }
  render();
}

searchInput.addEventListener("input", filter);

searchInput.addEventListener("keydown", (e) => {
  if (e.key === "ArrowDown") {
    e.preventDefault();
    if (selectedIndex < filteredTabs.length - 1) {
      selectedIndex++;
      updateSelection();
    }
  } else if (e.key === "ArrowUp") {
    e.preventDefault();
    if (selectedIndex > 0) {
      selectedIndex--;
      updateSelection();
    }
  } else if (e.key === "Enter" && filteredTabs.length > 0) {
    e.preventDefault();
    const tab = filteredTabs[selectedIndex];
    if (e.metaKey || e.ctrlKey) {
      moveTabToCurrent(tab);
    } else {
      switchToTab(tab);
    }
  } else if (e.key === "x" && (e.metaKey || e.ctrlKey) && filteredTabs.length > 0) {
    e.preventDefault();
    closeTab(filteredTabs[selectedIndex]);
  } else if (e.key === "Escape") {
    window.close();
  }
});

function updateSelection() {
  const items = tabList.querySelectorAll(".tab-item");
  items.forEach((item, i) => {
    item.classList.toggle("selected", i === selectedIndex);
  });
  items[selectedIndex]?.scrollIntoView({ block: "nearest" });
}

init();
