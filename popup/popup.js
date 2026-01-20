"use strict";

// Default settings
const DEFAULT_SETTINGS = {
  imageDownload: true,
  copyImageUrl: true,
  themeMode: "off", // off, dark (only two modes)
  brightness: 100, // 50-150
  contrast: 100, // 50-150
};

// DOM Elements
const toggleImageDownload = document.getElementById("toggleImageDownload");
const toggleCopyImageUrl = document.getElementById("toggleCopyImageUrl");
const toggleDarkMode = document.getElementById("toggleDarkMode");
const brightnessSlider = document.getElementById("brightnessSlider");
const brightnessValue = document.getElementById("brightnessValue");
const brightnessFill = document.getElementById("brightnessFill");
const brightnessThumb = document.getElementById("brightnessThumb");
const brightnessOption = document.getElementById("brightnessOption");
const contrastSlider = document.getElementById("contrastSlider");
const contrastValue = document.getElementById("contrastValue");
const contrastFill = document.getElementById("contrastFill");
const contrastThumb = document.getElementById("contrastThumb");
const contrastOption = document.getElementById("contrastOption");

// Current settings
let currentSettings = { ...DEFAULT_SETTINGS };

// Update custom slider visuals
function updateSliderVisual(slider, fill, thumb, value, displayValue) {
  const min = parseInt(slider.min);
  const max = parseInt(slider.max);
  const percent = ((value - min) / (max - min)) * 100;

  fill.style.width = percent + "%";
  thumb.style.left = percent + "%";
  displayValue.textContent = value;
}

// Update theme options visibility
function updateThemeOptionsVisibility(isDarkMode) {
  if (isDarkMode) {
    brightnessOption.classList.add("active");
    contrastOption.classList.add("active");
  } else {
    brightnessOption.classList.remove("active");
    contrastOption.classList.remove("active");
  }
}

// Load settings from storage
async function loadSettings() {
  try {
    const result = await chrome.storage.sync.get(["esUtilsSettings"]);
    currentSettings = { ...DEFAULT_SETTINGS, ...result.esUtilsSettings };

    // Map old theme modes to new simplified modes
    if (
      currentSettings.themeMode === "auto" ||
      currentSettings.themeMode === "light"
    ) {
      currentSettings.themeMode = "off";
    }

    toggleImageDownload.checked =
      currentSettings.imageDownload ?? DEFAULT_SETTINGS.imageDownload;
    toggleCopyImageUrl.checked =
      currentSettings.copyImageUrl ?? DEFAULT_SETTINGS.copyImageUrl;

    // Set dark mode toggle
    const isDarkMode = currentSettings.themeMode === "dark";
    toggleDarkMode.checked = isDarkMode;
    updateThemeOptionsVisibility(isDarkMode);

    // Set brightness slider
    const brightness =
      currentSettings.brightness ?? DEFAULT_SETTINGS.brightness;
    brightnessSlider.value = brightness;
    updateSliderVisual(
      brightnessSlider,
      brightnessFill,
      brightnessThumb,
      brightness,
      brightnessValue,
    );

    // Set contrast slider
    const contrast = currentSettings.contrast ?? DEFAULT_SETTINGS.contrast;
    contrastSlider.value = contrast;
    updateSliderVisual(
      contrastSlider,
      contrastFill,
      contrastThumb,
      contrast,
      contrastValue,
    );
  } catch (error) {
    console.error("Error loading settings:", error);
  }
}

// Save settings to storage
async function saveSettings() {
  currentSettings = {
    ...currentSettings,
    imageDownload: toggleImageDownload.checked,
    copyImageUrl: toggleCopyImageUrl.checked,
  };

  try {
    await chrome.storage.sync.set({ esUtilsSettings: currentSettings });
    // Notify content scripts about settings change
    notifyContentScripts(currentSettings);
  } catch (error) {
    console.error("Error saving settings:", error);
  }
}

// Handle dark mode toggle
function handleDarkModeToggle(isEnabled) {
  currentSettings.themeMode = isEnabled ? "dark" : "off";
  updateThemeOptionsVisibility(isEnabled);

  chrome.storage.sync
    .set({ esUtilsSettings: currentSettings })
    .then(() => {
      notifyContentScripts(currentSettings);
    })
    .catch((error) => {
      console.error("Error saving theme:", error);
    });
}

// Handle brightness change
function handleBrightnessChange(value) {
  currentSettings.brightness = parseInt(value);
  updateSliderVisual(
    brightnessSlider,
    brightnessFill,
    brightnessThumb,
    value,
    brightnessValue,
  );

  chrome.storage.sync
    .set({ esUtilsSettings: currentSettings })
    .then(() => {
      notifyContentScripts(currentSettings);
    })
    .catch((error) => {
      console.error("Error saving brightness:", error);
    });
}

// Handle contrast change
function handleContrastChange(value) {
  currentSettings.contrast = parseInt(value);
  updateSliderVisual(
    contrastSlider,
    contrastFill,
    contrastThumb,
    value,
    contrastValue,
  );

  chrome.storage.sync
    .set({ esUtilsSettings: currentSettings })
    .then(() => {
      notifyContentScripts(currentSettings);
    })
    .catch((error) => {
      console.error("Error saving contrast:", error);
    });
}

// Utility function for sending messages to tabs
function tabSendMessage(tabId, type, message, callback) {
  if (typeof message === "function") {
    chrome.tabs.sendMessage(tabId, { type }, (response) => {
      // Suppress errors for tabs without content script
      if (chrome.runtime.lastError) {
        // Silently ignore
        return;
      }
      message && message(response);
    });
  } else {
    chrome.tabs.sendMessage(tabId, { ...message, type }, (response) => {
      // Suppress errors for tabs without content script
      if (chrome.runtime.lastError) {
        // Silently ignore
        return;
      }
      callback && callback(response);
    });
  }
}

// Notify all tabs about settings change using utility function
async function notifyContentScripts(settings) {
  try {
    const tabs = await chrome.tabs.query({});
    tabs.forEach((tab) => {
      // Skip browser internal pages and invalid URLs
      if (
        tab.id &&
        tab.url &&
        !tab.url.startsWith("chrome://") &&
        !tab.url.startsWith("chrome-extension://") &&
        !tab.url.startsWith("edge://") &&
        !tab.url.startsWith("about:") &&
        !tab.url.startsWith("devtools://") &&
        !tab.url.startsWith("view-source:")
      ) {
        try {
          tabSendMessage(tab.id, "SETTINGS_UPDATED", { settings: settings });
        } catch (e) {
          // Ignore errors for tabs without content script
        }
      }
    });
  } catch (error) {
    console.error("Error notifying content scripts:", error);
  }
}

// Event listeners
toggleImageDownload.addEventListener("change", saveSettings);
toggleCopyImageUrl.addEventListener("change", saveSettings);

// Dark mode toggle listener
toggleDarkMode.addEventListener("change", (e) =>
  handleDarkModeToggle(e.target.checked),
);

// Brightness slider listener
brightnessSlider.addEventListener("input", (e) =>
  handleBrightnessChange(e.target.value),
);

// Contrast slider listener
contrastSlider.addEventListener("input", (e) =>
  handleContrastChange(e.target.value),
);

// Initialize
document.addEventListener("DOMContentLoaded", loadSettings);
