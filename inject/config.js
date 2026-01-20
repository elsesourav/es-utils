/**
 * ES Utils Theme System - Configuration
 *
 * Simplified: Only dark mode on/off, NO image inversion.
 */

"use strict";

// ============================================================================
// THEME MODES (Only dark and off)
// ============================================================================

const ThemeMode = {
  OFF: "off",
  DARK: "dark",
};

// ============================================================================
// DEFAULT VALUES
// ============================================================================

const DEFAULT_THEME = {
  mode: ThemeMode.OFF,
  brightness: 100,
  contrast: 100,
  grayscale: 0,
  sepia: 0,
};

// ============================================================================
// STORAGE KEYS
// ============================================================================

const StorageKeys = {
  THEME_MODE: "__esutils__themeMode",
  BRIGHTNESS: "__esutils__brightness",
  CONTRAST: "__esutils__contrast",
  GRAYSCALE: "__esutils__grayscale",
  SEPIA: "__esutils__sepia",
  WAS_ENABLED: "__esutils__wasEnabled",
};

// ============================================================================
// CSS CLASS NAMES AND IDS
// ============================================================================

const CssIdentifiers = {
  STYLE_PREFIX: "esutils",
  FALLBACK_CLASS: "esutils--fallback",
  SYNC_CLASS: "esutils--sync",
  DARK_THEME_CLASS: "es-utils-dark-theme",
  THEME_STYLE_ID: "es-utils-theme-style",
};

// ============================================================================
// EXPORT
// ============================================================================

if (typeof window !== "undefined") {
  window.ESUtilsConfig = {
    ThemeMode,
    DEFAULT_THEME,
    StorageKeys,
    CssIdentifiers,
  };
}
