importScripts("../utils/utils.js");

// Global error handler - suppress errors from showing in extension management
self.addEventListener("error", (event) => {
  console.error("ES Utils Background Error:", event.error);
  event.preventDefault();
});

self.addEventListener("unhandledrejection", (event) => {
  console.error("ES Utils Background Unhandled Rejection:", event.reason);
  event.preventDefault();
});

// Handle messages from content scripts using utility function
runtimeOnMessage("DOWNLOAD_IMAGE", (message, sender, sendResponse) => {
  downloadImage(message.url, message.filename);
  sendResponse({ success: true });
});

// Download image using Chrome downloads API
function downloadImage(url, filename) {
  try {
    // Clean up filename
    let cleanFilename = filename || "image.jpg";

    // Remove query parameters from filename if present
    if (cleanFilename.includes("?")) {
      cleanFilename = cleanFilename.split("?")[0];
    }

    // Ensure filename has an extension
    if (!cleanFilename.match(/\.(jpg|jpeg|png|gif|webp|svg|bmp|ico)$/i)) {
      cleanFilename += ".jpg";
    }

    // Sanitize filename - remove invalid characters
    cleanFilename = cleanFilename.replace(/[<>:"/\\|?*]/g, "_");

    chrome.downloads.download(
      {
        url: url,
        filename: cleanFilename,
        saveAs: false,
      },
      (downloadId) => {
        if (chrome.runtime.lastError) {
          console.error("ES Utils: Download failed", chrome.runtime.lastError);
        }
      },
    );
  } catch (error) {
    console.error("ES Utils: Download error", error);
  }
}

// Initialize default settings and context menu on install
runtimeOnInstalled((details) => {
  // Create context menu for images
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
    const defaultSettings = {
      imageDownload: true,
      copyImageUrl: true,
    };

    chrome.storage.sync.set({ esUtilsSettings: defaultSettings }, () => {
      console.log("ES Utils: Default settings initialized");
    });
  }
});

// Handle context menu clicks
contextMenusOnClicked((info, tab) => {
  try {
    if (info.menuItemId === "es-utils-download-image") {
      // Download the image
      const imageUrl = info.srcUrl;
      if (imageUrl) {
        // Extract filename from URL
        const filename = imageUrl.split("/").pop().split("?")[0] || "image.jpg";
        downloadImage(imageUrl, filename);
      }
    } else if (info.menuItemId === "es-utils-copy-image-url") {
      // Copy image URL to clipboard
      const imageUrl = info.srcUrl;
      if (imageUrl) {
        // Send message to content script to copy URL
        chrome.tabs.sendMessage(
          tab.id,
          {
            action: "COPY_URL_FROM_CONTEXT",
            url: imageUrl,
          },
          (response) => {
            // Suppress "Receiving end does not exist" error
            if (chrome.runtime.lastError) {
              console.log(
                "ES Utils: Content script not available, copying URL in background",
              );
              // Fallback: Copy directly without content script processing
              // Note: This won't process the URL, just copies as-is
            }
          },
        );
      }
    }
  } catch (error) {
    console.error("ES Utils: Context menu error", error);
  }
});
