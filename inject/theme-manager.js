/**
 * ES Utils - Theme Manager
 *
 * Public API for theme control.
 * - Only dark/off modes
 * - Detects already dark websites
 * - Images stay 100% original
 */

"use strict";

const ESUtilsThemeManager = (function () {
  // Private state
  let _currentMode = "off"; // "off" or "dark"
  let _brightness = 100;
  let _contrast = 100;
  let _grayscale = 0;
  let _sepia = 0;
  let _isInitialized = false;
  let _themeObserver = null;
  let _siteIsAlreadyDark = false;

  const getConfig = () => window.ESUtilsConfig || {};
  const getEngine = () => window.ESUtilsThemeEngine || {};

  // ============================================================================
  // SESSION STORAGE
  // ============================================================================

  function saveToSession() {
    const config = getConfig();
    const keys = config.StorageKeys || {};

    try {
      sessionStorage.setItem(
        keys.THEME_MODE || "__esutils__themeMode",
        _currentMode,
      );
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
        _currentMode === "dark" ? "true" : "false",
      );
    } catch (err) {
      console.warn("[ES Utils] Could not save to sessionStorage:", err);
    }
  }

  function loadFromSession() {
    const config = getConfig();
    const keys = config.StorageKeys || {};

    try {
      const mode = sessionStorage.getItem(
        keys.THEME_MODE || "__esutils__themeMode",
      );
      const brightness = sessionStorage.getItem(
        keys.BRIGHTNESS || "__esutils__brightness",
      );
      const contrast = sessionStorage.getItem(
        keys.CONTRAST || "__esutils__contrast",
      );
      const grayscale = sessionStorage.getItem(
        keys.GRAYSCALE || "__esutils__grayscale",
      );
      const sepia = sessionStorage.getItem(keys.SEPIA || "__esutils__sepia");

      if (mode === "dark" || mode === "off") _currentMode = mode;
      if (brightness) _brightness = parseInt(brightness, 10);
      if (contrast) _contrast = parseInt(contrast, 10);
      if (grayscale) _grayscale = parseInt(grayscale, 10);
      if (sepia) _sepia = parseInt(sepia, 10);
    } catch (err) {
      // sessionStorage might be disabled
    }
  }

  // ============================================================================
  // STYLE MANAGEMENT
  // ============================================================================

  function getOrCreateStyleElement(id, className) {
    let style = document.getElementById(id);

    if (!style) {
      style = document.createElement("style");
      style.id = id;
      style.classList.add("esutils");
      if (className) {
        style.classList.add(className);
      }
      style.media = "screen";

      if (document.head) {
        document.head.appendChild(style);
      } else {
        document.documentElement.appendChild(style);
      }
    }

    return style;
  }

  function removeFallbackStyle() {
    const fallback = document.querySelector(".esutils--fallback");
    if (fallback) {
      fallback.remove();
    }
  }

  function removeAllThemeStyles() {
    const config = getConfig();
    const ids = config.CssIdentifiers || {};

    const mainStyle = document.getElementById(
      ids.THEME_STYLE_ID || "es-utils-theme-style",
    );
    if (mainStyle) {
      mainStyle.remove();
    }

    removeFallbackStyle();

    document.documentElement.classList.remove(
      ids.DARK_THEME_CLASS || "es-utils-dark-theme",
    );
  }

  // ============================================================================
  // THEME APPLICATION
  // ============================================================================

  function applyTheme() {
    const config = getConfig();
    const engine = getEngine();
    const ids = config.CssIdentifiers || {};

    removeFallbackStyle();
    removeAllThemeStyles();
    saveToSession();

    // Off mode - don't apply any theme (original page restored)
    if (_currentMode === "off") {
      _siteIsAlreadyDark = false;
      return;
    }

    // Dark mode detection disabled - apply to all sites
    // Users can manually turn off if they don't want it
    _siteIsAlreadyDark = false;

    // Dark mode
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
      : createFallbackCSS(themeClass, themeConfig);

    const style = getOrCreateStyleElement(
      ids.THEME_STYLE_ID || "es-utils-theme-style",
      ids.SYNC_CLASS || "esutils--sync",
    );
    style.textContent = css;
  }

  function createFallbackCSS(themeClass, config) {
    const filterValue = `invert(100%) hue-rotate(180deg) brightness(${config.brightness}%) contrast(${config.contrast}%)`;

    return `
      @media screen {
        html.${themeClass} {
          -webkit-filter: ${filterValue} !important;
          filter: ${filterValue} !important;
          background: rgb(255, 255, 255) !important;
        }
      }
    `;
  }

  // ============================================================================
  // OBSERVER
  // ============================================================================

  function setupObserver() {
    if (_themeObserver) {
      _themeObserver.disconnect();
    }

    if (!document.body) {
      document.addEventListener("DOMContentLoaded", setupObserver);
      return;
    }

    const config = getConfig();
    const ids = config.CssIdentifiers || {};

    _themeObserver = new MutationObserver(() => {
      if (_currentMode === "off") {
        return;
      }

      const themeClass = ids.DARK_THEME_CLASS || "es-utils-dark-theme";
      if (!document.documentElement.classList.contains(themeClass)) {
        document.documentElement.classList.add(themeClass);
      }
    });

    _themeObserver.observe(document.body, {
      childList: true,
      subtree: true,
    });
  }

  // ============================================================================
  // PUBLIC API
  // ============================================================================

  return {
    init(options = {}) {
      if (_isInitialized) {
        return;
      }

      loadFromSession();

      // Map old modes to new simplified modes
      if (options.mode === "auto" || options.mode === "light") {
        _currentMode = "off";
      } else if (options.mode === "dark") {
        _currentMode = "dark";
      } else if (options.mode) {
        _currentMode = options.mode;
      }

      if (options.brightness !== undefined) _brightness = options.brightness;
      if (options.contrast !== undefined) _contrast = options.contrast;
      if (options.grayscale !== undefined) _grayscale = options.grayscale;
      if (options.sepia !== undefined) _sepia = options.sepia;

      applyTheme();
      setupObserver();

      _isInitialized = true;
    },

    setMode(mode) {
      // Only allow "dark" or "off"
      if (mode === "dark") {
        _currentMode = "dark";
      } else {
        _currentMode = "off";
      }
      applyTheme();
    },

    getMode() {
      return _currentMode;
    },

    // Toggle dark mode on/off
    toggle() {
      _currentMode = _currentMode === "dark" ? "off" : "dark";
      applyTheme();
      return _currentMode;
    },

    // Check if dark mode is enabled
    isDark() {
      return _currentMode === "dark";
    },

    setBrightness(value) {
      _brightness = Math.max(0, Math.min(200, value));
      applyTheme();
    },

    getBrightness() {
      return _brightness;
    },

    setContrast(value) {
      _contrast = Math.max(0, Math.min(200, value));
      applyTheme();
    },

    getContrast() {
      return _contrast;
    },

    setGrayscale(value) {
      _grayscale = Math.max(0, Math.min(100, value));
      applyTheme();
    },

    getGrayscale() {
      return _grayscale;
    },

    setSepia(value) {
      _sepia = Math.max(0, Math.min(100, value));
      applyTheme();
    },

    getSepia() {
      return _sepia;
    },

    update(settings) {
      // Map old modes to new
      if (settings.mode === "auto" || settings.mode === "light") {
        _currentMode = "off";
      } else if (settings.mode === "dark") {
        _currentMode = "dark";
      }

      if (settings.brightness !== undefined) _brightness = settings.brightness;
      if (settings.contrast !== undefined) _contrast = settings.contrast;
      if (settings.grayscale !== undefined) _grayscale = settings.grayscale;
      if (settings.sepia !== undefined) _sepia = settings.sepia;
      applyTheme();
    },

    getSettings() {
      return {
        mode: _currentMode,
        brightness: _brightness,
        contrast: _contrast,
        grayscale: _grayscale,
        sepia: _sepia,
      };
    },

    reset() {
      _currentMode = "off";
      _brightness = 100;
      _contrast = 100;
      _grayscale = 0;
      _sepia = 0;
      applyTheme();
    },

    destroy() {
      if (_themeObserver) {
        _themeObserver.disconnect();
        _themeObserver = null;
      }
      removeAllThemeStyles();
      _isInitialized = false;
    },
  };
})();

if (typeof window !== "undefined") {
  window.ESUtilsThemeManager = ESUtilsThemeManager;
}
