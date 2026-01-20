(function () {
  "use strict";

  const KEYS = {
    MODE: "__esutils__themeMode",
    BRIGHTNESS: "__esutils__brightness",
    CONTRAST: "__esutils__contrast",
  };
  const get = (key, def) => {
    try {
      return sessionStorage.getItem(key) || def;
    } catch {
      return def;
    }
  };

  const mode = get(KEYS.MODE, "off");
  if (mode !== "dark" || !(document.documentElement instanceof HTMLHtmlElement))
    return;
  if (
    document.querySelector(".esutils--fallback") ||
    document.querySelector(".esutils:not(.esutils--fallback)")
  )
    return;

  const brightness = parseInt(get(KEYS.BRIGHTNESS, "100"), 10);
  const contrast = parseInt(get(KEYS.CONTRAST, "100"), 10);

  let filter = "invert(100%) hue-rotate(180deg)";
  if (brightness !== 100) filter += ` brightness(${brightness}%)`;
  if (contrast !== 100) filter += ` contrast(${contrast}%)`;

  let reverseFilter = "";
  if (contrast !== 100)
    reverseFilter += `contrast(${Math.round((10000 / contrast) * 100) / 100}%) `;
  if (brightness !== 100)
    reverseFilter += `brightness(${Math.round((10000 / brightness) * 100) / 100}%) `;
  reverseFilter += "invert(100%) hue-rotate(180deg)";

  const css = `
html, html *, html *::before, html *::after, body, body *, body *::before, body *::after { transition: none !important; -webkit-transition: none !important; animation: none !important; -webkit-animation: none !important; }
html { -webkit-filter: ${filter} !important; filter: ${filter} !important; background-color: #fff !important; }
img, picture, picture *, video, canvas, svg:not([class*="icon"]), [style*="background-image"], iframe { -webkit-filter: ${reverseFilter} !important; filter: ${reverseFilter} !important; }
select, select *, option, optgroup, datalist, [popover], dialog { -webkit-filter: invert(100%) hue-rotate(180deg) !important; filter: invert(100%) hue-rotate(180deg) !important; }
html, html * { text-shadow: none !important; -webkit-font-smoothing: antialiased !important; -moz-osx-font-smoothing: grayscale !important; }
html h1, html h2, html h3, html h4, html h5, html h6, html a { color: inherit !important; opacity: 1 !important; }
html, body { opacity: 1 !important; }`;

  const style = document.createElement("style");
  style.classList.add("esutils", "esutils--fallback");
  style.media = "screen";
  style.textContent = css;

  if (document.head) {
    document.head.prepend(style);
  } else {
    document.documentElement.prepend(style);
    const obs = new MutationObserver(() => {
      if (document.head) {
        obs.disconnect();
        if (style.isConnected) document.head.prepend(style);
      }
    });
    obs.observe(document.documentElement, { childList: true });
  }
})();
