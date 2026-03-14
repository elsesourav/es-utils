"use strict";

const ESUtilsSettings = (function () {
  const STORAGE_KEYS = {
    GLOBAL: "esUtilsSettings",
    SITE_THEME: "esUtilsSiteThemeSettings",
  };

  const LOCAL_FILE_KEY = "local-file";

  const GLOBAL_DEFAULTS = {
    extensionEnabled: true,
    imageDownload: true,
    copyImageUrl: true,
  };

  const THEME_DEFAULTS = {
    themeMode: "off",
    brightness: 100,
    contrast: 100,
  };

  function normalizeThemeMode(mode) {
    return mode === "dark" ? "dark" : "off";
  }

  function normalizeNumber(value, fallback) {
    const numeric = Number(value);
    return Number.isFinite(numeric) ? numeric : fallback;
  }

  function normalizeGlobalSettings(rawSettings) {
    const safeRawSettings =
      rawSettings &&
      typeof rawSettings === "object" &&
      !Array.isArray(rawSettings)
        ? rawSettings
        : {};

    return {
      extensionEnabled: safeRawSettings.extensionEnabled !== false,
      imageDownload:
        safeRawSettings.imageDownload !== undefined
          ? !!safeRawSettings.imageDownload
          : GLOBAL_DEFAULTS.imageDownload,
      copyImageUrl:
        safeRawSettings.copyImageUrl !== undefined
          ? !!safeRawSettings.copyImageUrl
          : GLOBAL_DEFAULTS.copyImageUrl,
    };
  }

  function getThemeFallback() {
    return {
      themeMode: THEME_DEFAULTS.themeMode,
      brightness: THEME_DEFAULTS.brightness,
      contrast: THEME_DEFAULTS.contrast,
    };
  }

  function normalizeSiteThemeSettings(rawSettings) {
    const fallback = getThemeFallback();
    const safeRaw =
      rawSettings &&
      typeof rawSettings === "object" &&
      !Array.isArray(rawSettings)
        ? rawSettings
        : {};
    const merged = { ...fallback, ...safeRaw };

    return {
      themeMode: normalizeThemeMode(merged.themeMode),
      brightness: normalizeNumber(merged.brightness, fallback.brightness),
      contrast: normalizeNumber(merged.contrast, fallback.contrast),
    };
  }

  async function readSiteThemeSettingsMap() {
    const result = await chrome.storage.local.get([STORAGE_KEYS.SITE_THEME]);
    const rawMap = result[STORAGE_KEYS.SITE_THEME];
    return rawMap && typeof rawMap === "object" && !Array.isArray(rawMap)
      ? rawMap
      : {};
  }

  async function writeSiteThemeSettingsMap(map) {
    const normalizedMap = map && typeof map === "object" ? map : {};
    await chrome.storage.local.set({
      [STORAGE_KEYS.SITE_THEME]: normalizedMap,
    });
    return normalizedMap;
  }

  async function readSiteThemeSettings(siteKey) {
    const fallback = getThemeFallback();
    if (!siteKey) return fallback;

    const settingsMap = await readSiteThemeSettingsMap();
    return normalizeSiteThemeSettings(settingsMap[siteKey]);
  }

  async function writeSiteThemeSettings(siteKey, themeSettings) {
    if (!siteKey) return getThemeFallback();

    const fallback = getThemeFallback();
    const normalized = normalizeSiteThemeSettings(themeSettings);
    const settingsMap = await readSiteThemeSettingsMap();

    const usesFallback =
      normalized.themeMode === fallback.themeMode &&
      normalized.brightness === fallback.brightness &&
      normalized.contrast === fallback.contrast;

    if (usesFallback) delete settingsMap[siteKey];
    else settingsMap[siteKey] = normalized;

    await writeSiteThemeSettingsMap(settingsMap);
    return normalized;
  }

  function getSiteKeyFromUrl(url) {
    try {
      const parsed = new URL(url);
      if (parsed.protocol === "file:") return LOCAL_FILE_KEY;
      if (parsed.protocol !== "http:" && parsed.protocol !== "https:")
        return null;
      return (parsed.hostname || "").trim().toLowerCase() || null;
    } catch {
      return null;
    }
  }

  function getSiteKeyForCurrentPage() {
    if (typeof window === "undefined") return null;
    return getSiteKeyFromUrl(window.location.href);
  }

  async function readGlobalSettings() {
    const result = await chrome.storage.sync.get([STORAGE_KEYS.GLOBAL]);
    return normalizeGlobalSettings(result[STORAGE_KEYS.GLOBAL]);
  }

  async function writeGlobalSettings(settings) {
    const normalized = normalizeGlobalSettings(settings);
    await chrome.storage.sync.set({ [STORAGE_KEYS.GLOBAL]: normalized });
    return normalized;
  }

  return {
    STORAGE_KEYS,
    GLOBAL_DEFAULTS,
    THEME_DEFAULTS,
    normalizeGlobalSettings,
    getThemeFallback,
    normalizeSiteThemeSettings,
    readGlobalSettings,
    writeGlobalSettings,
    readSiteThemeSettingsMap,
    writeSiteThemeSettingsMap,
    readSiteThemeSettings,
    writeSiteThemeSettings,
    getSiteKeyFromUrl,
    getSiteKeyForCurrentPage,
  };
})();

if (typeof window !== "undefined") window.ESUtilsSettings = ESUtilsSettings;
if (typeof self !== "undefined") self.ESUtilsSettings = ESUtilsSettings;
