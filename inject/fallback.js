/**
 * ES Utils - Fallback Theme Injection
 *
 * Runs at document_start BEFORE page loads.
 * Applies dark theme immediately to prevent white flash.
 *
 * Simplified: Only dark/off, images stay in original colors.
 */

(function () {
  "use strict";

  const STORAGE_KEY_THEME_MODE = "__esutils__themeMode";
  const STORAGE_KEY_BRIGHTNESS = "__esutils__brightness";
  const STORAGE_KEY_CONTRAST = "__esutils__contrast";
  const FALLBACK_CLASS = "esutils--fallback";
  const STYLE_PREFIX = "esutils";

  function getSavedThemeMode() {
    try {
      return sessionStorage.getItem(STORAGE_KEY_THEME_MODE);
    } catch (err) {
      return null;
    }
  }

  function getSavedBrightness() {
    try {
      const val = sessionStorage.getItem(STORAGE_KEY_BRIGHTNESS);
      return val ? parseInt(val, 10) : 100;
    } catch (err) {
      return 100;
    }
  }

  function getSavedContrast() {
    try {
      const val = sessionStorage.getItem(STORAGE_KEY_CONTRAST);
      return val ? parseInt(val, 10) : 100;
    } catch (err) {
      return 100;
    }
  }

  function buildFilterValue(brightness, contrast) {
    // Only invert for dark mode base
    const filters = ["invert(100%)", "hue-rotate(180deg)"];

    // Brightness/contrast only for page, not images
    if (brightness !== 100) {
      filters.push(`brightness(${brightness}%)`);
    }

    if (contrast !== 100) {
      filters.push(`contrast(${contrast}%)`);
    }

    return filters.join(" ");
  }

  function shouldApplyFallback() {
    const savedMode = getSavedThemeMode();
    // Only apply if explicitly set to dark
    return savedMode === "dark";
  }

  function injectFallbackStyle() {
    if (!(document.documentElement instanceof HTMLHtmlElement)) {
      return;
    }

    if (document.querySelector(`.${FALLBACK_CLASS}`)) {
      return;
    }

    if (document.querySelector(`.${STYLE_PREFIX}:not(.${FALLBACK_CLASS})`)) {
      return;
    }

    const brightness = getSavedBrightness();
    const contrast = getSavedContrast();
    const filterValue = buildFilterValue(brightness, contrast);

    // CSS - images get ONLY invert+hue-rotate (brightness/contrast reset to 100%)
    const css = [
      "/* ES Utils Fallback - Dark Mode */",
      "",
      "html {",
      `    -webkit-filter: ${filterValue} !important;`,
      `    filter: ${filterValue} !important;`,
      "    background: rgb(255, 255, 255) !important;",
      "}",
      "",
      "/* Keep images 100% original - reset brightness/contrast */",
      'img, picture, picture *, video, canvas, svg:not(.icon), [style*="background-image"], iframe {',
      "    -webkit-filter: invert(100%) hue-rotate(180deg) brightness(100%) contrast(100%) !important;",
      "    filter: invert(100%) hue-rotate(180deg) brightness(100%) contrast(100%) !important;",
      "}",
      "",
      "/* Better text visibility */",
      "html, html * {",
      "    text-shadow: none !important;",
      "}",
      "",
      "/* Instant switching - no transitions */",
      "html, html *, body, body * {",
      "    -webkit-transition: none !important;",
      "    transition: none !important;",
      "}",
      "",
      "/* Prevent flashes during load */",
      "html, body {",
      "    opacity: 1 !important;",
      "}",
    ].join("\n");

    const style = document.createElement("style");
    style.classList.add(STYLE_PREFIX);
    style.classList.add(FALLBACK_CLASS);
    style.media = "screen";
    style.textContent = css;

    if (document.head) {
      document.head.prepend(style);
    } else {
      document.documentElement.prepend(style);

      const observer = new MutationObserver(() => {
        if (document.head) {
          observer.disconnect();
          if (style.isConnected) {
            document.head.prepend(style);
          }
        }
      });

      observer.observe(document.documentElement, { childList: true });
    }
  }

  if (shouldApplyFallback()) {
    injectFallbackStyle();
  }
})();
