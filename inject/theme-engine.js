/**
 * ES Utils - Theme Engine
 *
 * CSS Filter theme generation.
 * - Detects if site is already dark
 * - Images stay 100% original (no filters)
 * - Better text visibility in dark mode
 */

"use strict";

/**
 * Check if website is already dark themed
 * DISABLED - Always return false to allow dark mode on all sites
 */
function isWebsiteAlreadyDark() {
  // Disabled for now - too many false positives with transparent backgrounds
  return false;

  /* Original code kept for reference:
  try {
    const body = document.body;
    const html = document.documentElement;

    if (!body) return false;

    // Get computed background color
    const bodyBg = window.getComputedStyle(body).backgroundColor;
    const htmlBg = window.getComputedStyle(html).backgroundColor;

    // Parse RGB values including alpha
    const parseColor = (color) => {
      const match = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/);
      if (match) {
        return {
          r: parseInt(match[1]),
          g: parseInt(match[2]),
          b: parseInt(match[3]),
          a: match[4] !== undefined ? parseFloat(match[4]) : 1
        };
      }
      return null;
    };

    // Calculate luminance (0 = dark, 1 = light)
    const getLuminance = (rgb) => {
      if (!rgb || rgb.a < 0.5) return 1; // Transparent = not dark
      return (0.299 * rgb.r + 0.587 * rgb.g + 0.114 * rgb.b) / 255;
    };

    const bodyColor = parseColor(bodyBg);
    const htmlColor = parseColor(htmlBg);

    const bodyLum = getLuminance(bodyColor);
    const htmlLum = getLuminance(htmlColor);

    // Only consider dark if BOTH backgrounds are dark and opaque
    return bodyLum < 0.2 && htmlLum < 0.2;
  } catch (err) {
    return false;
  }
  */
}

/**
 * Generate CSS filter value string (for page only, NOT images)
 */
function getCSSFilterValue(config) {
  const {
    isDarkMode,
    brightness = 100,
    contrast = 100,
    grayscale = 0,
    sepia = 0,
  } = config;

  const filters = [];

  if (isDarkMode) {
    filters.push("invert(100%) hue-rotate(180deg)");
  }

  if (brightness !== 100) {
    filters.push(`brightness(${brightness}%)`);
  }

  if (contrast !== 100) {
    filters.push(`contrast(${contrast}%)`);
  }

  if (grayscale !== 0) {
    filters.push(`grayscale(${grayscale}%)`);
  }

  if (sepia !== 0) {
    filters.push(`sepia(${sepia}%)`);
  }

  return filters.length > 0 ? filters.join(" ") : null;
}

/**
 * Create CSS filter stylesheet
 * - Images stay 100% original (no filters at all)
 * - Better text visibility
 */
function createCSSFilterStyleSheet(options) {
  const { themeClass, config, isTopFrame = true } = options;

  const rootSelector = `html.${themeClass}`;
  const filterValue = getCSSFilterValue(config);
  const lines = [];

  lines.push("@media screen {");

  // Main filter on html (only invert + hue-rotate, brightness/contrast applied separately)
  if (config.isDarkMode && isTopFrame) {
    // Base dark mode filter
    const baseFilter = "invert(100%) hue-rotate(180deg)";

    // Build filter with brightness/contrast for non-image elements
    let fullFilter = baseFilter;
    if (config.brightness !== 100) {
      fullFilter += ` brightness(${config.brightness}%)`;
    }
    if (config.contrast !== 100) {
      fullFilter += ` contrast(${config.contrast}%)`;
    }

    lines.push("");
    lines.push("/* Dark mode filter */");
    lines.push(`${rootSelector} {`);
    lines.push(`    -webkit-filter: ${fullFilter} !important;`);
    lines.push(`    filter: ${fullFilter} !important;`);
    lines.push("}");
  }

  // Better text visibility in dark mode
  if (config.isDarkMode && isTopFrame) {
    lines.push("");
    lines.push("/* Better text visibility */");
    lines.push(`${rootSelector} {`);
    lines.push("    text-shadow: none !important;");
    lines.push("    -webkit-font-smoothing: antialiased !important;");
    lines.push("    -moz-osx-font-smoothing: grayscale !important;");
    lines.push("}");
    lines.push("");
    lines.push(`${rootSelector} * {`);
    lines.push("    text-shadow: none !important;");
    lines.push("}");
  }

  // Keep images 100% original - remove ALL filters
  if (config.isDarkMode && isTopFrame) {
    lines.push("");
    lines.push("/* Keep images 100% original - no filters */");
    lines.push(`${rootSelector} img,`);
    lines.push(`${rootSelector} picture,`);
    lines.push(`${rootSelector} picture *,`);
    lines.push(`${rootSelector} video,`);
    lines.push(`${rootSelector} canvas,`);
    lines.push(`${rootSelector} svg:not(.icon),`);
    lines.push(`${rootSelector} [style*="background-image"],`);
    lines.push(`${rootSelector} iframe {`);
    lines.push(
      "    -webkit-filter: invert(100%) hue-rotate(180deg) brightness(100%) contrast(100%) !important;",
    );
    lines.push(
      "    filter: invert(100%) hue-rotate(180deg) brightness(100%) contrast(100%) !important;",
    );
    lines.push("}");
  }

  // Disable transitions for instant theme switching
  lines.push("");
  lines.push("/* Instant theme switching - no transitions */");
  lines.push("html, html *, body, body * {");
  lines.push("    -webkit-transition: none !important;");
  lines.push("    transition: none !important;");
  lines.push("}");

  // Full screen - remove filter
  lines.push("");
  lines.push("/* Full screen - Remove filter */");
  [":-webkit-full-screen", ":-moz-full-screen", ":fullscreen"].forEach(
    (fullScreen) => {
      lines.push(`${fullScreen}, ${fullScreen} * {`);
      lines.push("    -webkit-filter: none !important;");
      lines.push("    filter: none !important;");
      lines.push("}");
    },
  );

  // Page background
  if (isTopFrame) {
    lines.push("");
    lines.push("/* Page background */");
    lines.push(`${rootSelector} {`);
    lines.push("    background: rgb(255, 255, 255) !important;");
    lines.push("}");
  }

  lines.push("");
  lines.push("}");

  return lines.join("\n");
}

// Export
if (typeof window !== "undefined") {
  window.ESUtilsThemeEngine = {
    getCSSFilterValue,
    createCSSFilterStyleSheet,
    isWebsiteAlreadyDark,
  };
}
