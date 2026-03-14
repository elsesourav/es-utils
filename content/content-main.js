"use strict";

window.addEventListener("error", (e) => {
  if (e.filename?.includes("es-utils")) e.preventDefault();
});
window.addEventListener("unhandledrejection", (e) => e.preventDefault());

const SETTINGS_API = ESUtilsSettings;

let esUtilsSettings = { ...SETTINGS_API.GLOBAL_DEFAULTS };
const BUTTON_CLASS = "es-utils-img-buttons";
const MIN_SIZE_PERCENT = 15;
let imageObserversStarted = false;
let driveClickListenerAttached = false;

function persistSessionState() {
  try {
    const siteKey = SETTINGS_API.getSiteKeyForCurrentPage();
    const modeValue = esUtilsSettings.extensionEnabled
      ? esUtilsSettings.themeMode || "off"
      : "off";
    const brightnessValue = Number.isFinite(Number(esUtilsSettings.brightness))
      ? Number(esUtilsSettings.brightness)
      : 100;
    const contrastValue = Number.isFinite(Number(esUtilsSettings.contrast))
      ? Number(esUtilsSettings.contrast)
      : 100;

    sessionStorage.setItem(
      "__esutils__extensionEnabled",
      esUtilsSettings.extensionEnabled ? "true" : "false",
    );
    sessionStorage.setItem("__esutils__themeMode", modeValue);

    if (siteKey) {
      sessionStorage.setItem(`__esutils__themeMode__${siteKey}`, modeValue);
      sessionStorage.setItem(
        `__esutils__brightness__${siteKey}`,
        String(brightnessValue),
      );
      sessionStorage.setItem(
        `__esutils__contrast__${siteKey}`,
        String(contrastValue),
      );
    }
  } catch {}
}

function applyThemeState() {
  if (typeof ESUtilsThemeManager === "undefined") return;

  if (!esUtilsSettings.extensionEnabled) {
    ESUtilsThemeManager.update({ mode: "off" });
    ESUtilsThemeManager.destroy();
    return;
  }

  ESUtilsThemeManager.init({
    mode: esUtilsSettings.themeMode || "off",
    brightness: esUtilsSettings.brightness || 100,
    contrast: esUtilsSettings.contrast || 100,
  });

  ESUtilsThemeManager.update({
    mode: esUtilsSettings.themeMode || "off",
    brightness: esUtilsSettings.brightness || 100,
    contrast: esUtilsSettings.contrast || 100,
  });
}

function hasImageFeaturesEnabled() {
  return !!(esUtilsSettings.imageDownload || esUtilsSettings.copyImageUrl);
}

function disableImageRuntime() {
  removeAllButtons();
  if (driveClickListenerAttached) {
    document.removeEventListener("click", handleDriveClick, true);
    driveClickListenerAttached = false;
  }
}

function enableImageRuntime() {
  if (!imageObserversStarted) {
    observeImages();
    imageObserversStarted = true;
  }
  if (
    location.hostname.includes("drive.google.com") &&
    !driveClickListenerAttached
  ) {
    document.addEventListener("click", handleDriveClick, true);
    driveClickListenerAttached = true;
  }
  updateAllButtons();
}

function applySettings() {
  persistSessionState();
  applyThemeState();

  if (!esUtilsSettings.extensionEnabled || !hasImageFeaturesEnabled()) {
    disableImageRuntime();
    return;
  }

  enableImageRuntime();
}

async function init() {
  await loadSettings();
  applySettings();
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
  const globalSettings = await SETTINGS_API.readGlobalSettings();
  const siteKey = SETTINGS_API.getSiteKeyForCurrentPage();
  const siteThemeSettings = await SETTINGS_API.readSiteThemeSettings(siteKey);

  esUtilsSettings = {
    ...globalSettings,
    ...siteThemeSettings,
  };
}

runtimeOnMessage("SETTINGS_UPDATED", async () => {
  await loadSettings();
  applySettings();
});

runtimeOnMessage("COPY_URL_FROM_CONTEXT", (msg) => {
  if (!esUtilsSettings.extensionEnabled) return;
  if (msg.url) navigator.clipboard.writeText(processImageUrl(msg.url));
});

document.readyState === "complete"
  ? init()
  : window.addEventListener("load", init);
