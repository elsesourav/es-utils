"use strict";

const ICONS = {
  download: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>`,
  copy: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>`,
  check: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`,
};

function optimizeImageUrl(url) {
  return url?.replace(/([?&])q(uality)?=\d+/gi, "$1q$2=100") || url;
}

function extractRealImageUrl(url) {
  if (!url) return url;
  try {
    const u = new URL(url);
    if (u.hostname.includes("google") && u.pathname.includes("/imgres"))
      return decodeURIComponent(u.searchParams.get("imgurl") || url);
    if (u.hostname.includes("google") && u.pathname === "/url")
      return decodeURIComponent(
        u.searchParams.get("url") || u.searchParams.get("q") || url,
      );
    if (u.hostname.includes("googleusercontent.com"))
      return url.replace(/=w\d+-h\d+.*$/, "=s0").replace(/=s\d+.*$/, "=s0");
    if (u.hostname.includes("drive.google.com")) {
      const m = url.match(/\/file\/d\/([^/]+)/);
      if (m) return `https://drive.google.com/uc?export=download&id=${m[1]}`;
      const id = u.searchParams.get("id");
      if (id) return `https://drive.google.com/uc?export=download&id=${id}`;
    }
    if (u.hostname.includes("dropbox.com"))
      return url
        .replace("dl=0", "dl=1")
        .replace("www.dropbox.com", "dl.dropboxusercontent.com");
    if (u.hostname.includes("pinimg.com"))
      return url
        .replace(/\/\d+x\d*\//, "/originals/")
        .replace(/\/\d+x\//, "/originals/");
    return url;
  } catch {
    return url;
  }
}

function processImageUrl(url) {
  return optimizeImageUrl(extractRealImageUrl(url));
}

function getFilename(url) {
  try {
    const name = new URL(extractRealImageUrl(url)).pathname.split("/").pop();
    return /\.(jpg|jpeg|png|gif|webp|svg|bmp|ico)$/i.test(name)
      ? name
      : `${name || "image"}.jpg`;
  } catch {
    return "image.jpg";
  }
}

function createButton(type, url, img) {
  const btn = document.createElement("button");
  btn.className = `es-utils-btn es-utils-btn-${type}`;
  btn.setAttribute("data-es-utils", "true");
  btn.setAttribute("data-es-utils-url", url);
  btn._esUtilsImg = img;
  btn.innerHTML = ICONS[type];
  btn.title = type === "download" ? "Download Image" : "Copy Image URL";
  btn.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
    const currentUrl = getButtonUrl(btn);
    type === "download" ? downloadImage(currentUrl) : copyUrl(currentUrl, btn);
  });
  return btn;
}

function getButtonUrl(btn) {
  const img = btn._esUtilsImg;
  if (img) {
    const src = img.src || img.dataset.src || img.currentSrc;
    if (src) return processImageUrl(src);
  }
  return btn.getAttribute("data-es-utils-url");
}

function createButtonContainer(img) {
  if (img.dataset.esUtilsProcessed === "true") return null;
  const rect = img.getBoundingClientRect();
  const minW = (window.innerWidth * MIN_SIZE_PERCENT) / 100;
  const minH = (window.innerHeight * MIN_SIZE_PERCENT) / 100;
  if (rect.width < minW && rect.height < minH) return null;
  const src = img.src || img.dataset.src || img.currentSrc;
  if (!src || src.startsWith("data:") || src.includes("blank.gif")) return null;

  const url = processImageUrl(src);
  const container = document.createElement("div");
  container.className = BUTTON_CLASS;
  container.setAttribute("data-es-utils", "true");
  container._esUtilsImg = img;
  if (esUtilsSettings.imageDownload)
    container.appendChild(createButton("download", url, img));
  if (esUtilsSettings.copyImageUrl)
    container.appendChild(createButton("copy", url, img));
  observeSrcChange(img, container);
  img.dataset.esUtilsProcessed = "true";
  return container;
}

function setupButtons(img) {
  if (!esUtilsSettings.imageDownload && !esUtilsSettings.copyImageUrl) return;
  const container = createButtonContainer(img);
  if (!container) return;
  const parent = img.parentElement;
  if (!parent) return;
  if (parent.classList.contains("es-utils-has-buttons"))
    parent.querySelector(`.${BUTTON_CLASS}`)?.remove();
  if (getComputedStyle(parent).position === "static")
    parent.style.position = "relative";
  parent.appendChild(container);
  parent.classList.add("es-utils-has-buttons");
}

function downloadImage(url) {
  runtimeSendMessage("DOWNLOAD_IMAGE", { url, filename: getFilename(url) });
}

async function copyUrl(url, btn) {
  await navigator.clipboard.writeText(url);
  btn.classList.add("es-utils-btn-success");
  const original = btn.innerHTML;
  btn.innerHTML = ICONS.check;
  setTimeout(() => {
    btn.classList.remove("es-utils-btn-success");
    btn.innerHTML = original;
  }, 1500);
}

function observeSrcChange(img, container) {
  if (img._esUtilsSrcObserver) return;
  const observer = new MutationObserver((muts) => {
    muts.forEach((m) => {
      if (m.attributeName === "src" || m.attributeName === "data-src") {
        const src = img.src || img.dataset.src || img.currentSrc;
        if (src && !src.startsWith("data:")) {
          const url = processImageUrl(src);
          container
            .querySelectorAll(".es-utils-btn")
            .forEach((b) => b.setAttribute("data-es-utils-url", url));
        }
      }
    });
  });
  observer.observe(img, {
    attributes: true,
    attributeFilter: ["src", "data-src", "srcset"],
  });
  img._esUtilsSrcObserver = observer;
}

function processImages() {
  document.querySelectorAll("img").forEach((img) => {
    img.complete && img.naturalWidth > 0
      ? setupButtons(img)
      : img.addEventListener("load", () => setupButtons(img), { once: true });
  });
}

function observeImages() {
  const observer = new MutationObserver((muts) => {
    muts.forEach((m) => {
      m.addedNodes.forEach((n) => {
        if (n.nodeType !== Node.ELEMENT_NODE) return;
        if (n.tagName === "IMG")
          n.complete && n.naturalWidth > 0
            ? setupButtons(n)
            : n.addEventListener("load", () => setupButtons(n), { once: true });
        n.querySelectorAll?.("img").forEach((img) => {
          img.complete && img.naturalWidth > 0
            ? setupButtons(img)
            : img.addEventListener("load", () => setupButtons(img), {
                once: true,
              });
        });
      });
      m.removedNodes.forEach((n) => {
        if (n.classList?.contains(BUTTON_CLASS)) {
          const img = m.target.querySelector("img");
          if (img?.dataset.esUtilsProcessed === "true") {
            delete img.dataset.esUtilsProcessed;
            setTimeout(() => setupButtons(img), 100);
          }
        }
      });
    });
  });
  observer.observe(document.body, { childList: true, subtree: true });
}

function removeAllButtons() {
  document.querySelectorAll(`.${BUTTON_CLASS}`).forEach((e) => e.remove());
  document
    .querySelectorAll("[data-es-utils-processed]")
    .forEach((e) => delete e.dataset.esUtilsProcessed);
  document
    .querySelectorAll(".es-utils-has-buttons")
    .forEach((e) => e.classList.remove("es-utils-has-buttons"));
  document.querySelectorAll("img").forEach((img) => {
    img._esUtilsSrcObserver?.disconnect();
    delete img._esUtilsSrcObserver;
  });
}

function updateAllButtons() {
  document.querySelectorAll(`.${BUTTON_CLASS}`).forEach((e) => e.remove());
  document
    .querySelectorAll("[data-es-utils-processed]")
    .forEach((e) => delete e.dataset.esUtilsProcessed);
  processImages();
}
