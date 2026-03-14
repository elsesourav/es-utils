(function () {
  "use strict";

  const GLOBAL_KEYS = {
    EXTENSION_ENABLED: "__esutils__extensionEnabled",
    MODE: "__esutils__themeMode",
    BRIGHTNESS: "__esutils__brightness",
    CONTRAST: "__esutils__contrast",
  };

  const STORAGE_KEYS = {
    GLOBAL_SETTINGS: "esUtilsSettings",
    SITE_THEME_SETTINGS: "esUtilsSiteThemeSettings",
  };

  const LOCAL_FILE_KEY = "local-file";

  if (!(document.documentElement instanceof HTMLHtmlElement)) return;

  function getSiteKeyFromLocation() {
    try {
      const protocol = window.location.protocol;
      if (protocol === "file:") return LOCAL_FILE_KEY;
      if (protocol !== "http:" && protocol !== "https:") return null;
      return (window.location.hostname || "").trim().toLowerCase() || null;
    } catch {
      return null;
    }
  }

  function getSessionValue(key, fallbackValue) {
    try {
      const value = sessionStorage.getItem(key);
      return value === null ? fallbackValue : value;
    } catch {
      return fallbackValue;
    }
  }

  function normalizeExtensionEnabled(value) {
    return value !== false && value !== "false";
  }

  function normalizeThemeMode(value) {
    return value === "dark" ? "dark" : "off";
  }

  function normalizeNumber(value, fallbackValue) {
    const numeric = Number(value);
    return Number.isFinite(numeric) ? numeric : fallbackValue;
  }

  function inversePercent(value) {
    const safeValue = Math.max(1, normalizeNumber(value, 100));
    return Math.round((10000 / safeValue) * 100) / 100;
  }

  function buildFilter(brightness, contrast) {
    let filter = "invert(100%) hue-rotate(180deg)";
    if (brightness !== 100) filter += ` brightness(${brightness}%)`;
    if (contrast !== 100) filter += ` contrast(${contrast}%)`;
    return filter;
  }

  function buildReverseFilter(brightness, contrast) {
    let reverseFilter = "invert(100%) hue-rotate(180deg)";
    if (brightness !== 100)
      reverseFilter += ` brightness(${inversePercent(brightness)}%)`;
    if (contrast !== 100)
      reverseFilter += ` contrast(${inversePercent(contrast)}%)`;
    return reverseFilter;
  }

  function hasSyncedThemeStyle() {
    return !!document.querySelector(".esutils:not(.esutils--fallback)");
  }

  function getFallbackStyleNode() {
    return document.querySelector("style.esutils--fallback");
  }

  function removeFallbackStyle() {
    const fallback = getFallbackStyleNode();
    if (fallback) fallback.remove();
  }

  function ensureFallbackStyle(css) {
    if (hasSyncedThemeStyle()) {
      removeFallbackStyle();
      return;
    }

    let style = getFallbackStyleNode();
    if (!style) {
      style = document.createElement("style");
      style.classList.add("esutils", "esutils--fallback");
      style.media = "screen";

      if (document.head) {
        document.head.prepend(style);
      } else {
        document.documentElement.prepend(style);
        const observer = new MutationObserver(() => {
          if (!document.head) return;
          observer.disconnect();
          if (style.isConnected) document.head.prepend(style);
        });
        observer.observe(document.documentElement, { childList: true });
      }
    }

    style.textContent = css;
  }

  function applyFallbackStyle(brightness, contrast) {
    const normalizedBrightness = normalizeNumber(brightness, 100);
    const normalizedContrast = normalizeNumber(contrast, 100);
    const filter = buildFilter(normalizedBrightness, normalizedContrast);
    const reverseFilter = buildReverseFilter(
      normalizedBrightness,
      normalizedContrast,
    );

    const css = `
html, html *, html *::before, html *::after, body, body *, body *::before, body *::after { transition: none !important; -webkit-transition: none !important; animation: none !important; -webkit-animation: none !important; }
html { -webkit-filter: ${filter} !important; filter: ${filter} !important; background-color: #fff !important; }
img, picture, picture *, video, canvas, svg, object, embed, [style*="background-image"], iframe { -webkit-filter: ${reverseFilter} !important; filter: ${reverseFilter} !important; }
select, select *, option, optgroup, datalist, [popover], dialog { -webkit-filter: invert(100%) hue-rotate(180deg) !important; filter: invert(100%) hue-rotate(180deg) !important; }
html, html * { text-shadow: none !important; -webkit-font-smoothing: antialiased !important; -moz-osx-font-smoothing: grayscale !important; }
html h1, html h2, html h3, html h4, html h5, html h6, html a { color: inherit !important; opacity: 1 !important; }
html, body { opacity: 1 !important; }`;

    ensureFallbackStyle(css);
  }

  async function reconcileAuthoritativeTheme(siteKey) {
    try {
      const syncResult = await chrome.storage.sync.get([
        STORAGE_KEYS.GLOBAL_SETTINGS,
      ]);
      const globalSettings = syncResult[STORAGE_KEYS.GLOBAL_SETTINGS];
      const extensionEnabled = normalizeExtensionEnabled(
        globalSettings?.extensionEnabled,
      );

      if (!extensionEnabled || !siteKey) {
        removeFallbackStyle();
        return;
      }

      const localResult = await chrome.storage.local.get([
        STORAGE_KEYS.SITE_THEME_SETTINGS,
      ]);
      const mapValue = localResult[STORAGE_KEYS.SITE_THEME_SETTINGS];
      const settingsMap =
        mapValue && typeof mapValue === "object" && !Array.isArray(mapValue)
          ? mapValue
          : {};

      const siteTheme =
        settingsMap[siteKey] && typeof settingsMap[siteKey] === "object"
          ? settingsMap[siteKey]
          : null;

      const mode = normalizeThemeMode(siteTheme?.themeMode);
      if (mode !== "dark") {
        removeFallbackStyle();
        return;
      }

      applyFallbackStyle(siteTheme?.brightness, siteTheme?.contrast);
    } catch {}
  }

  const siteKey = getSiteKeyFromLocation();
  const extensionEnabled = normalizeExtensionEnabled(
    getSessionValue(GLOBAL_KEYS.EXTENSION_ENABLED, "true"),
  );

  if (!extensionEnabled || !siteKey) {
    removeFallbackStyle();
    return;
  }

  const modeKey = `${GLOBAL_KEYS.MODE}__${siteKey}`;
  const brightnessKey = `${GLOBAL_KEYS.BRIGHTNESS}__${siteKey}`;
  const contrastKey = `${GLOBAL_KEYS.CONTRAST}__${siteKey}`;

  const mode = normalizeThemeMode(
    getSessionValue(modeKey, getSessionValue(GLOBAL_KEYS.MODE, "off")),
  );
  const brightness = normalizeNumber(
    getSessionValue(
      brightnessKey,
      getSessionValue(GLOBAL_KEYS.BRIGHTNESS, "100"),
    ),
    100,
  );
  const contrast = normalizeNumber(
    getSessionValue(contrastKey, getSessionValue(GLOBAL_KEYS.CONTRAST, "100")),
    100,
  );

  if (mode === "dark") applyFallbackStyle(brightness, contrast);
  else removeFallbackStyle();

  reconcileAuthoritativeTheme(siteKey);
})();
