"use strict";

function getCSSFilterValue(config) {
  const {
    isDarkMode,
    brightness = 100,
    contrast = 100,
    grayscale = 0,
    sepia = 0,
  } = config;
  const filters = [];
  if (isDarkMode) filters.push("invert(100%) hue-rotate(180deg)");
  if (brightness !== 100) filters.push(`brightness(${brightness}%)`);
  if (contrast !== 100) filters.push(`contrast(${contrast}%)`);
  if (grayscale) filters.push(`grayscale(${grayscale}%)`);
  if (sepia) filters.push(`sepia(${sepia}%)`);
  return filters.length ? filters.join(" ") : null;
}

function createCSSFilterStyleSheet({ themeClass, config, isTopFrame = true }) {
  const root = `html.${themeClass}`;
  const lines = ["@media screen {"];

  if (config.isDarkMode && isTopFrame) {
    let filter = "invert(100%) hue-rotate(180deg)";
    if (config.brightness !== 100)
      filter += ` brightness(${config.brightness}%)`;
    if (config.contrast !== 100) filter += ` contrast(${config.contrast}%)`;

    lines.push(
      `${root} { -webkit-filter: ${filter} !important; filter: ${filter} !important; }`,
    );
    lines.push(
      `${root}, ${root} * { text-shadow: none !important; -webkit-font-smoothing: antialiased !important; -moz-osx-font-smoothing: grayscale !important; }`,
    );
    lines.push(
      `${root} h1, ${root} h2, ${root} h3, ${root} h4, ${root} h5, ${root} h6, ${root} a { color: inherit !important; opacity: 1 !important; }`,
    );

    let reverseFilter = "";
    if (config.contrast !== 100)
      reverseFilter += `contrast(${Math.round((10000 / config.contrast) * 100) / 100}%) `;
    if (config.brightness !== 100)
      reverseFilter += `brightness(${Math.round((10000 / config.brightness) * 100) / 100}%) `;
    reverseFilter += "invert(100%) hue-rotate(180deg)";

    lines.push(
      `${root} img, ${root} picture, ${root} picture *, ${root} video, ${root} canvas, ${root} svg:not([class*="icon"]), ${root} [style*="background-image"], ${root} iframe { -webkit-filter: ${reverseFilter} !important; filter: ${reverseFilter} !important; }`,
    );
    lines.push(
      `${root} select, ${root} select *, ${root} option, ${root} optgroup, ${root} datalist, ${root} [popover], ${root} dialog { -webkit-filter: invert(100%) hue-rotate(180deg) !important; filter: invert(100%) hue-rotate(180deg) !important; }`,
    );
  }

  lines.push(
    `${root}, ${root} *, ${root} *::before, ${root} *::after { -webkit-transition: none !important; transition: none !important; -webkit-animation: none !important; animation: none !important; }`,
  );
  [":-webkit-full-screen", ":-moz-full-screen", ":fullscreen"].forEach((fs) =>
    lines.push(
      `${fs}, ${fs} * { -webkit-filter: none !important; filter: none !important; }`,
    ),
  );
  if (isTopFrame)
    lines.push(`${root} { background: rgb(255, 255, 255) !important; }`);
  lines.push("}");

  return lines.join("\n");
}

if (typeof window !== "undefined") {
  window.ESUtilsThemeEngine = { getCSSFilterValue, createCSSFilterStyleSheet };
}
