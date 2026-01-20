"use strict";

window.addEventListener("error", (e) => {
  if (e.filename?.includes("es-utils")) e.preventDefault();
});
window.addEventListener("unhandledrejection", (e) => e.preventDefault());

const DEFAULTS = {
  imageDownload: true,
  copyImageUrl: true,
  themeMode: "off",
  brightness: 100,
  contrast: 100,
};
let esUtilsSettings = { ...DEFAULTS };
const BUTTON_CLASS = "es-utils-img-buttons";
const MIN_SIZE_PERCENT = 15;

async function init() {
  await loadSettings();
  if (typeof ESUtilsThemeManager !== "undefined") {
    ESUtilsThemeManager.init({
      mode: esUtilsSettings.themeMode || "off",
      brightness: esUtilsSettings.brightness || 100,
      contrast: esUtilsSettings.contrast || 100,
    });
  }
  initImageButtons();
}

function initImageButtons() {
  if (!esUtilsSettings.imageDownload && !esUtilsSettings.copyImageUrl) return;
  observeImages();
  processImages();
  if (location.hostname.includes("drive.google.com")) {
    document.addEventListener("click", handleDriveClick, true);
  }
}

function handleDriveClick(e) {
  if (e.target.closest(`.${BUTTON_CLASS}`) || e.target.closest(".es-utils-btn"))
    return;
  document.querySelectorAll(`.${BUTTON_CLASS}`).forEach((el) => el.remove());
  document
    .querySelectorAll("[data-es-utils-processed]")
    .forEach((el) => delete el.dataset.esUtilsProcessed);
  setTimeout(processImages, 500);
}

async function loadSettings() {
  const result = await chrome.storage.sync.get(["esUtilsSettings"]);
  esUtilsSettings = result.esUtilsSettings || DEFAULTS;
}

runtimeOnMessage("SETTINGS_UPDATED", (msg) => {
  esUtilsSettings = msg.settings;
  if (typeof ESUtilsThemeManager !== "undefined") {
    ESUtilsThemeManager.update({
      mode: msg.settings.themeMode,
      brightness: msg.settings.brightness,
      contrast: msg.settings.contrast,
    });
  }
  !esUtilsSettings.imageDownload && !esUtilsSettings.copyImageUrl
    ? removeAllButtons()
    : updateAllButtons();
});

runtimeOnMessage("COPY_URL_FROM_CONTEXT", (msg) => {
  if (msg.url) navigator.clipboard.writeText(processImageUrl(msg.url));
});

document.readyState === "complete"
  ? init()
  : window.addEventListener("load", init);
