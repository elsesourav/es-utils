"use strict";

const SETTINGS_API = ESUtilsSettings;
const $ = (id) => document.getElementById(id);

const el = {
  extensionEnabled: $("toggleExtensionEnabled"),
  imageDownload: $("toggleImageDownload"),
  copyImageUrl: $("toggleCopyImageUrl"),
  themeSiteScope: $("themeSiteScope"),
  darkMode: $("toggleDarkMode"),
  brightness: $("brightnessSlider"),
  brightnessVal: $("brightnessValue"),
  brightnessFill: $("brightnessFill"),
  brightnessThumb: $("brightnessThumb"),
  brightnessOpt: $("brightnessOption"),
  contrast: $("contrastSlider"),
  contrastVal: $("contrastValue"),
  contrastFill: $("contrastFill"),
  contrastThumb: $("contrastThumb"),
  contrastOpt: $("contrastOption"),
};

let settings = { ...SETTINGS_API.GLOBAL_DEFAULTS };
let siteThemeSettings = { ...SETTINGS_API.THEME_DEFAULTS };
let activeSiteKey = null;

function updateSlider(slider, fill, thumb, valEl, value) {
  const pct = ((value - slider.min) / (slider.max - slider.min)) * 100;
  fill.style.width = `${pct}%`;
  thumb.style.left = `${pct}%`;
  valEl.textContent = value;
}

function toggleThemeOptions(show) {
  el.brightnessOpt.classList.toggle("active", show);
  el.contrastOpt.classList.toggle("active", show);
}

function setControlState(input, enabled) {
  input.disabled = !enabled;
  input.closest(".option-item")?.classList.toggle("is-disabled", !enabled);
}

function setThemeScopeLabel() {
  if (!el.themeSiteScope) return;
  if (activeSiteKey) {
    el.themeSiteScope.textContent = `Saved for site: ${activeSiteKey}`;
    return;
  }
  el.themeSiteScope.textContent =
    "Theme settings are unavailable on this page.";
}

function applyControlAvailability() {
  const extensionEnabled = settings.extensionEnabled !== false;
  const hasSiteKey = Boolean(activeSiteKey);
  const canEditImageSettings = extensionEnabled;
  const canEditTheme = extensionEnabled && hasSiteKey;
  const canEditThemeValues =
    canEditTheme && siteThemeSettings.themeMode === "dark";

  setControlState(el.imageDownload, canEditImageSettings);
  setControlState(el.copyImageUrl, canEditImageSettings);
  setControlState(el.darkMode, canEditTheme);
  setControlState(el.brightness, canEditThemeValues);
  setControlState(el.contrast, canEditThemeValues);

  toggleThemeOptions(canEditThemeValues);
}

async function getActiveTabUrl() {
  const tabs = await chrome.tabs.query({ currentWindow: true, active: true });
  return tabs[0]?.url || null;
}

async function resolveActiveSiteKey() {
  const url = await getActiveTabUrl();
  if (!url) return null;
  return SETTINGS_API.getSiteKeyFromUrl(url);
}

async function loadSettings() {
  activeSiteKey = await resolveActiveSiteKey();
  settings = await SETTINGS_API.readGlobalSettings();
  siteThemeSettings = await SETTINGS_API.readSiteThemeSettings(activeSiteKey);

  el.extensionEnabled.checked = settings.extensionEnabled;
  el.imageDownload.checked = settings.imageDownload;
  el.copyImageUrl.checked = settings.copyImageUrl;
  el.darkMode.checked = siteThemeSettings.themeMode === "dark";
  setThemeScopeLabel();
  applyControlAvailability();

  el.brightness.value = siteThemeSettings.brightness;
  updateSlider(
    el.brightness,
    el.brightnessFill,
    el.brightnessThumb,
    el.brightnessVal,
    siteThemeSettings.brightness,
  );
  el.contrast.value = siteThemeSettings.contrast;
  updateSlider(
    el.contrast,
    el.contrastFill,
    el.contrastThumb,
    el.contrastVal,
    siteThemeSettings.contrast,
  );
}

async function saveGlobalSettings() {
  settings = await SETTINGS_API.writeGlobalSettings(settings);
  await notifyTabs();
}

async function saveSiteThemeSettings() {
  if (!activeSiteKey) return;

  siteThemeSettings = await SETTINGS_API.writeSiteThemeSettings(
    activeSiteKey,
    siteThemeSettings,
  );
  await notifyTabs();
}

async function saveExtensionEnabled(enabled) {
  settings.extensionEnabled = enabled;
  applyControlAvailability();
  await saveGlobalSettings();
}

async function saveDarkMode(enabled) {
  siteThemeSettings.themeMode = enabled ? "dark" : "off";
  applyControlAvailability();
  await saveSiteThemeSettings();
}

async function saveBrightness(value) {
  siteThemeSettings.brightness = parseInt(value, 10);
  updateSlider(
    el.brightness,
    el.brightnessFill,
    el.brightnessThumb,
    el.brightnessVal,
    value,
  );
  await saveSiteThemeSettings();
}

async function saveContrast(value) {
  siteThemeSettings.contrast = parseInt(value, 10);
  updateSlider(
    el.contrast,
    el.contrastFill,
    el.contrastThumb,
    el.contrastVal,
    value,
  );
  await saveSiteThemeSettings();
}

async function notifyTabs() {
  const tabs = await chrome.tabs.query({});
  const blocked =
    /^(chrome|edge|about|devtools|view-source):|chrome-extension:/;
  tabs.forEach((tab) => {
    if (tab.id && tab.url && !blocked.test(tab.url)) {
      chrome.tabs.sendMessage(tab.id, { type: "SETTINGS_UPDATED" }, () => {
        if (chrome.runtime.lastError) {
          // Ignore tabs without content script
        }
      });
    }
  });
}

el.extensionEnabled.addEventListener("change", (e) =>
  saveExtensionEnabled(e.target.checked),
);
el.imageDownload.addEventListener("change", async () => {
  settings.imageDownload = el.imageDownload.checked;
  await saveGlobalSettings();
});
el.copyImageUrl.addEventListener("change", async () => {
  settings.copyImageUrl = el.copyImageUrl.checked;
  await saveGlobalSettings();
});
el.darkMode.addEventListener("change", (e) => saveDarkMode(e.target.checked));
el.brightness.addEventListener("input", (e) => saveBrightness(e.target.value));
el.contrast.addEventListener("input", (e) => saveContrast(e.target.value));
document.addEventListener("DOMContentLoaded", loadSettings);
