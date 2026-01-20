"use strict";

const ESUtilsThemeManager = (function () {
  let _mode = "off",
    _brightness = 100,
    _contrast = 100,
    _grayscale = 0,
    _sepia = 0,
    _initialized = false,
    _observer = null;

  const getConfig = () => window.ESUtilsConfig || {};
  const getEngine = () => window.ESUtilsThemeEngine || {};

  function saveSession() {
    const keys = getConfig().StorageKeys || {};
    try {
      sessionStorage.setItem(keys.THEME_MODE || "__esutils__themeMode", _mode);
      sessionStorage.setItem(
        keys.BRIGHTNESS || "__esutils__brightness",
        String(_brightness),
      );
      sessionStorage.setItem(
        keys.CONTRAST || "__esutils__contrast",
        String(_contrast),
      );
      sessionStorage.setItem(
        keys.GRAYSCALE || "__esutils__grayscale",
        String(_grayscale),
      );
      sessionStorage.setItem(keys.SEPIA || "__esutils__sepia", String(_sepia));
      sessionStorage.setItem(
        keys.WAS_ENABLED || "__esutils__wasEnabled",
        _mode === "dark" ? "true" : "false",
      );
    } catch {}
  }

  function loadSession() {
    const keys = getConfig().StorageKeys || {};
    try {
      const mode = sessionStorage.getItem(
        keys.THEME_MODE || "__esutils__themeMode",
      );
      const b = sessionStorage.getItem(
        keys.BRIGHTNESS || "__esutils__brightness",
      );
      const c = sessionStorage.getItem(keys.CONTRAST || "__esutils__contrast");
      const g = sessionStorage.getItem(
        keys.GRAYSCALE || "__esutils__grayscale",
      );
      const s = sessionStorage.getItem(keys.SEPIA || "__esutils__sepia");
      if (mode === "dark" || mode === "off") _mode = mode;
      if (b) _brightness = parseInt(b, 10);
      if (c) _contrast = parseInt(c, 10);
      if (g) _grayscale = parseInt(g, 10);
      if (s) _sepia = parseInt(s, 10);
    } catch {}
  }

  function getOrCreateStyle(id, className) {
    let style = document.getElementById(id);
    if (!style) {
      style = document.createElement("style");
      style.id = id;
      style.classList.add("esutils");
      if (className) style.classList.add(className);
      style.media = "screen";
      (document.head || document.documentElement).appendChild(style);
    }
    return style;
  }

  function removeStyles() {
    const ids = getConfig().CssIdentifiers || {};
    document
      .getElementById(ids.THEME_STYLE_ID || "es-utils-theme-style")
      ?.remove();
    document.querySelector(".esutils--fallback")?.remove();
    document.documentElement.classList.remove(
      ids.DARK_THEME_CLASS || "es-utils-dark-theme",
    );
  }

  function apply() {
    const ids = getConfig().CssIdentifiers || {};
    const engine = getEngine();
    removeStyles();
    saveSession();

    if (_mode === "off") return;

    const themeClass = ids.DARK_THEME_CLASS || "es-utils-dark-theme";
    document.documentElement.classList.add(themeClass);

    const themeConfig = {
      isDarkMode: true,
      brightness: _brightness,
      contrast: _contrast,
      grayscale: _grayscale,
      sepia: _sepia,
    };
    const css = engine.createCSSFilterStyleSheet
      ? engine.createCSSFilterStyleSheet({
          themeClass,
          config: themeConfig,
          isTopFrame: window === window.top,
        })
      : createFallback(themeClass, themeConfig);

    const style = getOrCreateStyle(
      ids.THEME_STYLE_ID || "es-utils-theme-style",
      ids.SYNC_CLASS || "esutils--sync",
    );
    style.textContent = css;
  }

  function createFallback(themeClass, config) {
    const filter = `invert(100%) hue-rotate(180deg) brightness(${config.brightness}%) contrast(${config.contrast}%)`;
    return `@media screen { html.${themeClass} { -webkit-filter: ${filter} !important; filter: ${filter} !important; background: #fff !important; } html.${themeClass} img, html.${themeClass} video { -webkit-filter: invert(100%) hue-rotate(180deg) !important; filter: invert(100%) hue-rotate(180deg) !important; } }`;
  }

  function setupObserver() {
    _observer?.disconnect();
    if (!document.body) {
      document.addEventListener("DOMContentLoaded", setupObserver);
      return;
    }
    const ids = getConfig().CssIdentifiers || {};
    const themeClass = ids.DARK_THEME_CLASS || "es-utils-dark-theme";
    _observer = new MutationObserver(() => {
      if (
        _mode !== "off" &&
        !document.documentElement.classList.contains(themeClass)
      )
        document.documentElement.classList.add(themeClass);
    });
    _observer.observe(document.body, { childList: true, subtree: true });
  }

  return {
    init(opts = {}) {
      if (_initialized) return;
      loadSession();
      if (opts.mode === "auto" || opts.mode === "light") _mode = "off";
      else if (opts.mode === "dark") _mode = "dark";
      else if (opts.mode) _mode = opts.mode;
      if (opts.brightness !== undefined) _brightness = opts.brightness;
      if (opts.contrast !== undefined) _contrast = opts.contrast;
      if (opts.grayscale !== undefined) _grayscale = opts.grayscale;
      if (opts.sepia !== undefined) _sepia = opts.sepia;
      apply();
      setupObserver();
      _initialized = true;
    },

    setMode(mode) {
      _mode = mode === "dark" ? "dark" : "off";
      apply();
    },
    getMode: () => _mode,
    toggle() {
      _mode = _mode === "dark" ? "off" : "dark";
      apply();
      return _mode;
    },
    isDark: () => _mode === "dark",

    setBrightness(v) {
      _brightness = Math.max(0, Math.min(200, v));
      apply();
    },
    getBrightness: () => _brightness,
    setContrast(v) {
      _contrast = Math.max(0, Math.min(200, v));
      apply();
    },
    getContrast: () => _contrast,
    setGrayscale(v) {
      _grayscale = Math.max(0, Math.min(100, v));
      apply();
    },
    getGrayscale: () => _grayscale,
    setSepia(v) {
      _sepia = Math.max(0, Math.min(100, v));
      apply();
    },
    getSepia: () => _sepia,

    update(s) {
      if (s.mode === "auto" || s.mode === "light") _mode = "off";
      else if (s.mode === "dark") _mode = "dark";
      if (s.brightness !== undefined) _brightness = s.brightness;
      if (s.contrast !== undefined) _contrast = s.contrast;
      if (s.grayscale !== undefined) _grayscale = s.grayscale;
      if (s.sepia !== undefined) _sepia = s.sepia;
      apply();
    },

    getSettings: () => ({
      mode: _mode,
      brightness: _brightness,
      contrast: _contrast,
      grayscale: _grayscale,
      sepia: _sepia,
    }),
    reset() {
      _mode = "off";
      _brightness = 100;
      _contrast = 100;
      _grayscale = 0;
      _sepia = 0;
      apply();
    },
    destroy() {
      _observer?.disconnect();
      _observer = null;
      removeStyles();
      _initialized = false;
    },
  };
})();

if (typeof window !== "undefined")
  window.ESUtilsThemeManager = ESUtilsThemeManager;
