"use strict";

const DEFAULTS = {
  imageDownload: true,
  copyImageUrl: true,
  themeMode: "off",
  brightness: 100,
  contrast: 100,
};
const $ = (id) => document.getElementById(id);

const el = {
  imageDownload: $("toggleImageDownload"),
  copyImageUrl: $("toggleCopyImageUrl"),
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

let settings = { ...DEFAULTS };

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

async function loadSettings() {
  const result = await chrome.storage.sync.get(["esUtilsSettings"]);
  settings = { ...DEFAULTS, ...result.esUtilsSettings };
  if (settings.themeMode === "auto" || settings.themeMode === "light")
    settings.themeMode = "off";

  el.imageDownload.checked = settings.imageDownload;
  el.copyImageUrl.checked = settings.copyImageUrl;
  el.darkMode.checked = settings.themeMode === "dark";
  toggleThemeOptions(settings.themeMode === "dark");

  el.brightness.value = settings.brightness;
  updateSlider(
    el.brightness,
    el.brightnessFill,
    el.brightnessThumb,
    el.brightnessVal,
    settings.brightness,
  );
  el.contrast.value = settings.contrast;
  updateSlider(
    el.contrast,
    el.contrastFill,
    el.contrastThumb,
    el.contrastVal,
    settings.contrast,
  );
}

async function save() {
  settings.imageDownload = el.imageDownload.checked;
  settings.copyImageUrl = el.copyImageUrl.checked;
  await chrome.storage.sync.set({ esUtilsSettings: settings });
  notifyTabs();
}

function saveDarkMode(enabled) {
  settings.themeMode = enabled ? "dark" : "off";
  toggleThemeOptions(enabled);
  chrome.storage.sync.set({ esUtilsSettings: settings }).then(notifyTabs);
}

function saveBrightness(value) {
  settings.brightness = parseInt(value);
  updateSlider(
    el.brightness,
    el.brightnessFill,
    el.brightnessThumb,
    el.brightnessVal,
    value,
  );
  chrome.storage.sync.set({ esUtilsSettings: settings }).then(notifyTabs);
}

function saveContrast(value) {
  settings.contrast = parseInt(value);
  updateSlider(
    el.contrast,
    el.contrastFill,
    el.contrastThumb,
    el.contrastVal,
    value,
  );
  chrome.storage.sync.set({ esUtilsSettings: settings }).then(notifyTabs);
}

async function notifyTabs() {
  const tabs = await chrome.tabs.query({});
  const blocked =
    /^(chrome|edge|about|devtools|view-source):|chrome-extension:/;
  tabs.forEach((tab) => {
    if (tab.id && tab.url && !blocked.test(tab.url)) {
      chrome.tabs.sendMessage(tab.id, { type: "SETTINGS_UPDATED", settings });
    }
  });
}

el.imageDownload.addEventListener("change", save);
el.copyImageUrl.addEventListener("change", save);
el.darkMode.addEventListener("change", (e) => saveDarkMode(e.target.checked));
el.brightness.addEventListener("input", (e) => saveBrightness(e.target.value));
el.contrast.addEventListener("input", (e) => saveContrast(e.target.value));
document.addEventListener("DOMContentLoaded", loadSettings);
