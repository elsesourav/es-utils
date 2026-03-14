importScripts("../utils/utils.js", "../utils/settings.js");

self.addEventListener("error", (e) => e.preventDefault());
self.addEventListener("unhandledrejection", (e) => e.preventDefault());

const MENU_DOWNLOAD_ID = "es-utils-download-image";
const MENU_COPY_ID = "es-utils-copy-image-url";
const MENU_ITEMS = [
  {
    id: MENU_DOWNLOAD_ID,
    title: "⬇ Download",
    contexts: ["image"],
  },
  {
    id: MENU_COPY_ID,
    title: "📋 Copy URL",
    contexts: ["image"],
  },
];

let menuSyncChain = Promise.resolve();

function queueMenuSync() {
  menuSyncChain = menuSyncChain
    .catch(() => {})
    .then(() => syncContextMenusInternal());
  return menuSyncChain;
}

function createContextMenu(item) {
  return new Promise((resolve) => {
    chrome.contextMenus.create(item, () => {
      const error = chrome.runtime.lastError;
      if (error && !/duplicate id/i.test(error.message || "")) {
        console.warn("ES Utils: failed to create context menu", {
          id: item.id,
          message: error.message,
        });
      }
      resolve();
    });
  });
}

function removeAllContextMenus() {
  return new Promise((resolve) => {
    chrome.contextMenus.removeAll(() => {
      const error = chrome.runtime.lastError;
      if (error) {
        console.warn("ES Utils: failed to clear context menus", error.message);
      }
      resolve();
    });
  });
}

async function ensureGlobalSettings() {
  const normalizedSettings = await ESUtilsSettings.readGlobalSettings();
  await ESUtilsSettings.writeGlobalSettings(normalizedSettings);
  return normalizedSettings;
}

async function getGlobalSettings() {
  return ESUtilsSettings.readGlobalSettings();
}

async function isExtensionEnabled() {
  const settings = await getGlobalSettings();
  return settings.extensionEnabled;
}

async function syncContextMenusInternal() {
  await removeAllContextMenus();
  if (!(await isExtensionEnabled())) return;
  for (const item of MENU_ITEMS) await createContextMenu(item);
}

runtimeOnMessage("DOWNLOAD_IMAGE", (msg, sender, respond) => {
  isExtensionEnabled().then((enabled) => {
    if (!enabled) {
      respond({ success: false, disabled: true });
      return;
    }
    downloadImage(msg.url, msg.filename);
    respond({ success: true });
  });
});

function downloadImage(url, filename) {
  if (!url) return;
  let name = (filename || "image.jpg").split("?")[0];
  if (!/\.(jpg|jpeg|png|gif|webp|svg|bmp|ico)$/i.test(name)) name += ".jpg";
  name = name.replace(/[<>:"/\\|?*]/g, "_");
  chrome.downloads.download({ url, filename: name, saveAs: false });
}

runtimeOnInstalled(() => {
  ensureGlobalSettings().then(queueMenuSync);
});

chrome.runtime.onStartup.addListener(() => {
  queueMenuSync();
});

contextMenusOnClicked((info, tab) => {
  const url = info.srcUrl;
  if (!url || !tab?.id) return;

  isExtensionEnabled().then((enabled) => {
    if (!enabled) return;

    if (info.menuItemId === MENU_DOWNLOAD_ID) {
      downloadImage(url, url.split("/").pop());
    } else if (info.menuItemId === MENU_COPY_ID) {
      tabSendMessage(tab.id, "COPY_URL_FROM_CONTEXT", { url });
    }
  });
});

chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName !== "sync" || !changes.esUtilsSettings) return;

  const oldEnabled =
    changes.esUtilsSettings.oldValue?.extensionEnabled !== false;
  const newEnabled =
    changes.esUtilsSettings.newValue?.extensionEnabled !== false;
  if (oldEnabled !== newEnabled) {
    queueMenuSync();
  }
});

ensureGlobalSettings().then(queueMenuSync);
