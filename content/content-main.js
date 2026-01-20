"use strict";

// Global error handler - suppress errors from showing in extension management
window.addEventListener("error", (event) => {
  if (event.filename && event.filename.includes("es-utils")) {
    console.error("ES Utils Content Error:", event.error);
    event.preventDefault();
  }
});

window.addEventListener("unhandledrejection", (event) => {
  console.error("ES Utils Content Unhandled Rejection:", event.reason);
  event.preventDefault();
});

// Default settings
const ES_UTILS_DEFAULT_SETTINGS = {
  imageDownload: true,
  copyImageUrl: true,
  themeMode: "off", // "off" or "dark" only
  brightness: 100,
  contrast: 100,
};

let esUtilsSettings = { ...ES_UTILS_DEFAULT_SETTINGS };
const BUTTON_CONTAINER_CLASS = "es-utils-img-buttons";
const MIN_IMAGE_PERCENT = 15; // Minimum image size as percentage of window to show buttons

// Initialize all features
async function initAllFeatures() {
  try {
    await loadSettings();

    // Initialize theme using the new theme manager
    if (typeof ESUtilsThemeManager !== "undefined") {
      ESUtilsThemeManager.init({
        mode: esUtilsSettings.themeMode || "off",
        brightness: esUtilsSettings.brightness || 100,
        contrast: esUtilsSettings.contrast || 100,
      });
    }

    // Initialize image utils
    initImageUtils();
  } catch (error) {
    console.error("ES Utils: Initialization error", error);
  }
}

// Initialize image utilities
function initImageUtils() {
  try {
    // Exit early if both features are disabled - don't modify page at all
    if (!esUtilsSettings.imageDownload && !esUtilsSettings.copyImageUrl) {
      return;
    }

    observeImages();
    processExistingImages();

    // Google Drive specific: Refresh buttons on any click to handle dynamic content
    if (window.location.hostname.includes("drive.google.com")) {
      document.addEventListener(
        "click",
        (e) => {
          try {
            // Don't refresh if clicking on our own buttons or their container
            if (
              e.target.closest(`.${BUTTON_CONTAINER_CLASS}`) ||
              e.target.classList.contains("es-utils-btn") ||
              e.target.closest(".es-utils-btn")
            ) {
              return;
            }

            // Remove all existing buttons
            document
              .querySelectorAll(`.${BUTTON_CONTAINER_CLASS}`)
              .forEach((el) => el.remove());

            // Remove processed markers so images can be reprocessed
            document
              .querySelectorAll("[data-es-utils-processed]")
              .forEach((el) => {
                delete el.dataset.esUtilsProcessed;
              });

            // Re-add buttons after a short delay to allow Drive to update
            setTimeout(() => {
              processExistingImages();
            }, 500);
          } catch (error) {
            console.error("ES Utils: Drive click handler error", error);
          }
        },
        true,
      ); // Use capture phase to catch all clicks
    }
  } catch (error) {
    console.error("ES Utils: Initialization error", error);
  }
}

// Load settings from storage
async function loadSettings() {
  try {
    const result = await chrome.storage.sync.get(["esUtilsSettings"]);
    esUtilsSettings = result.esUtilsSettings || ES_UTILS_DEFAULT_SETTINGS;
  } catch (error) {
    console.error("ES Utils: Error loading settings", error);
  }
}

// Listen for settings updates from popup using utility function
runtimeOnMessage("SETTINGS_UPDATED", (message, sender, sendResponse) => {
  esUtilsSettings = message.settings;

  // Update theme using the new theme manager
  if (typeof ESUtilsThemeManager !== "undefined") {
    ESUtilsThemeManager.update({
      mode: message.settings.themeMode,
      brightness: message.settings.brightness,
      contrast: message.settings.contrast,
      grayscale: message.settings.grayscale,
      sepia: message.settings.sepia,
    });
  }

  // If features were disabled, remove buttons
  if (!esUtilsSettings.imageDownload && !esUtilsSettings.copyImageUrl) {
    removeAllButtons();
  } else {
    // Re-process images with new settings
    updateAllButtons();
  }
});

// Listen for context menu copy request
runtimeOnMessage("COPY_URL_FROM_CONTEXT", (message, sender, sendResponse) => {
  if (message.url) {
    // Process URL (extract real URL + optimize)
    const processedUrl = processImageUrl(message.url);

    // Copy to clipboard
    navigator.clipboard
      .writeText(processedUrl)
      .then(() => {
        console.log("ES Utils: URL copied from context menu");
      })
      .catch((error) => {
        console.error("ES Utils: Failed to copy URL", error);
      });
  }
});

// Initialize after page is fully loaded (including all images and resources)
if (document.readyState === "complete") {
  initAllFeatures();
} else {
  window.addEventListener("load", initAllFeatures);
}
