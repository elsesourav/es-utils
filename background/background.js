importScripts("../utils/utils.js");

self.addEventListener("error", (e) => e.preventDefault());
self.addEventListener("unhandledrejection", (e) => e.preventDefault());

runtimeOnMessage("DOWNLOAD_IMAGE", (msg, sender, respond) => {
  downloadImage(msg.url, msg.filename);
  respond({ success: true });
});

function downloadImage(url, filename) {
  let name = (filename || "image.jpg").split("?")[0];
  if (!/\.(jpg|jpeg|png|gif|webp|svg|bmp|ico)$/i.test(name)) name += ".jpg";
  name = name.replace(/[<>:"/\\|?*]/g, "_");
  chrome.downloads.download({ url, filename: name, saveAs: false });
}

runtimeOnInstalled((details) => {
  chrome.contextMenus.create({
    id: "es-utils-download-image",
    title: "⬇ Download",
    contexts: ["image"],
  });
  chrome.contextMenus.create({
    id: "es-utils-copy-image-url",
    title: "📋 Copy URL",
    contexts: ["image"],
  });

  if (details.reason === "install") {
    chrome.storage.sync.set({
      esUtilsSettings: { imageDownload: true, copyImageUrl: true },
    });
  }
});

contextMenusOnClicked((info, tab) => {
  const url = info.srcUrl;
  if (!url) return;

  if (info.menuItemId === "es-utils-download-image") {
    downloadImage(url, url.split("/").pop());
  } else if (info.menuItemId === "es-utils-copy-image-url") {
    chrome.tabs.sendMessage(tab.id, { action: "COPY_URL_FROM_CONTEXT", url });
  }
});
