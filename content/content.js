"use strict";

// Default settings
const ES_UTILS_DEFAULT_SETTINGS = {
  imageDownload: true,
  copyImageUrl: true,
};

let esUtilsSettings = { ...ES_UTILS_DEFAULT_SETTINGS };
const BUTTON_CONTAINER_CLASS = "es-utils-img-buttons";
const MIN_IMAGE_PERCENT = 15; // Minimum image size as percentage of window to show buttons

// Initialize
async function initImageUtils() {
  await loadSettings();

  // Exit early if both features are disabled - don't modify page at all
  if (!esUtilsSettings.imageDownload && !esUtilsSettings.copyImageUrl) {
    return;
  }

  observeImages();
  processExistingImages();
}

// Load settings from storage
async function loadSettings() {
  try {
    const result = await chrome.storage.sync.get(["esUtilsSettings"]);
    esUtilsSettings = result.esUtilsSettings || ES_UTILS_DEFAULT_SETTINGS;
  } catch (error) {
    console.error("ES Utils: Error loading settings", error);
  }
}

// Listen for settings updates from popup using utility function
runtimeOnMessage("SETTINGS_UPDATED", (message, sender, sendResponse) => {
  esUtilsSettings = message.settings;

  // If features were disabled, remove buttons
  if (!esUtilsSettings.imageDownload && !esUtilsSettings.copyImageUrl) {
    removeAllButtons();
  } else {
    // Re-process images with new settings
    updateAllButtons();
  }
});

// Listen for context menu copy request
runtimeOnMessage("COPY_URL_FROM_CONTEXT", (message, sender, sendResponse) => {
  if (message.url) {
    // Process URL (extract real URL + optimize)
    const processedUrl = processImageUrl(message.url);

    // Copy to clipboard
    navigator.clipboard
      .writeText(processedUrl)
      .then(() => {
        console.log("ES Utils: URL copied from context menu");
      })
      .catch((error) => {
        console.error("ES Utils: Failed to copy URL", error);
      });
  }
});

// Optimize image URL for better quality (always on - q=100)
function optimizeImageUrl(url) {
  if (!url) return url;

  try {
    let optimizedUrl = url;

    // Replace quality parameter (q=XX) with q=100
    optimizedUrl = optimizedUrl.replace(/([?&])q=\d+/gi, "$1q=100");

    // Replace quality parameter in different formats
    optimizedUrl = optimizedUrl.replace(/([?&])quality=\d+/gi, "$1quality=100");

    return optimizedUrl;
  } catch (error) {
    return url;
  }
}

// Extract real image URL from Google Images, Google Drive, and other services
function extractRealImageUrl(url) {
  if (!url) return url;

  try {
    const urlObj = new URL(url);

    // Google Images - extract from imgurl parameter
    if (
      urlObj.hostname.includes("google") &&
      urlObj.pathname.includes("/imgres")
    ) {
      const imgUrl = urlObj.searchParams.get("imgurl");
      if (imgUrl) return decodeURIComponent(imgUrl);
    }

    // Google Images - extract from url parameter in /url path
    if (urlObj.hostname.includes("google") && urlObj.pathname === "/url") {
      const realUrl =
        urlObj.searchParams.get("url") || urlObj.searchParams.get("q");
      if (realUrl) return decodeURIComponent(realUrl);
    }

    // Google encrypted URLs (encrypted-tbn)
    if (urlObj.hostname.includes("encrypted-tbn")) {
      // These are Google's thumbnail proxies, keep as is but they work for download
      return url;
    }

    // Google User Content (blogspot, etc.)
    if (urlObj.hostname.includes("googleusercontent.com")) {
      // Remove size restrictions for full image
      let cleanUrl = url.replace(/=w\d+-h\d+.*$/, "=s0");
      cleanUrl = cleanUrl.replace(/=s\d+.*$/, "=s0");
      return cleanUrl;
    }

    // Google Drive - convert to direct download link
    if (urlObj.hostname.includes("drive.google.com")) {
      // Format: https://drive.google.com/file/d/FILE_ID/view
      const fileIdMatch = url.match(/\/file\/d\/([^/]+)/);
      if (fileIdMatch) {
        return `https://drive.google.com/uc?export=download&id=${fileIdMatch[1]}`;
      }
      // Format: https://drive.google.com/open?id=FILE_ID
      const openIdMatch = urlObj.searchParams.get("id");
      if (openIdMatch) {
        return `https://drive.google.com/uc?export=download&id=${openIdMatch}`;
      }
    }

    // Google Photos
    if (
      urlObj.hostname.includes("lh3.googleusercontent.com") ||
      urlObj.hostname.includes("lh4.googleusercontent.com") ||
      urlObj.hostname.includes("lh5.googleusercontent.com")
    ) {
      // Remove size restrictions
      return url.replace(/=w\d+-h\d+.*$/, "=s0").replace(/=s\d+.*$/, "=s0");
    }

    // Dropbox - convert to direct download
    if (urlObj.hostname.includes("dropbox.com")) {
      return url
        .replace("dl=0", "dl=1")
        .replace("www.dropbox.com", "dl.dropboxusercontent.com");
    }

    // Pinterest - get original image
    if (urlObj.hostname.includes("pinimg.com")) {
      return url
        .replace(/\/\d+x\d*\//, "/originals/")
        .replace(/\/\d+x\//, "/originals/");
    }

    return url;
  } catch (error) {
    return url;
  }
}

// Process image URL - extract real URL then optimize
function processImageUrl(url) {
  let processedUrl = extractRealImageUrl(url);
  processedUrl = optimizeImageUrl(processedUrl);
  return processedUrl;
}

// Get image filename from URL
function getImageFilename(url) {
  try {
    // First extract real URL if it's a Google/Drive link
    const realUrl = extractRealImageUrl(url);
    const urlObj = new URL(realUrl);
    const pathname = urlObj.pathname;
    const filename = pathname.split("/").pop();

    // If filename doesn't have an extension, add one
    if (
      filename &&
      !filename.match(/\.(jpg|jpeg|png|gif|webp|svg|bmp|ico)$/i)
    ) {
      return filename + ".jpg";
    }

    return filename || "image.jpg";
  } catch (error) {
    return "image.jpg";
  }
}

// Create button element
function createButton(type, imageUrl, img) {
  const button = document.createElement("button");
  button.className = `es-utils-btn es-utils-btn-${type}`;
  button.setAttribute("data-es-utils", "true");
  button.setAttribute("data-es-utils-url", imageUrl);
  if (img) button._esUtilsImg = img; // Store reference to image

  if (type === "download") {
    button.innerHTML = `
         <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
            <polyline points="7 10 12 15 17 10"></polyline>
            <line x1="12" y1="15" x2="12" y2="3"></line>
         </svg>
      `;
    button.title = "Download Image";
    button.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      // Get current URL from image (in case it changed)
      const currentUrl = getButtonImageUrl(button);
      downloadImage(currentUrl);
    });
  } else if (type === "copy") {
    button.innerHTML = `
         <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
         </svg>
      `;
    button.title = "Copy Image URL";
    button.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      // Get current URL from image (in case it changed)
      const currentUrl = getButtonImageUrl(button);
      copyImageUrl(currentUrl, button);
    });
  }

  return button;
}

// Get current image URL for a button (checks if src changed)
function getButtonImageUrl(button) {
  const img = button._esUtilsImg;
  if (img) {
    const currentSrc = img.src || img.dataset.src || img.currentSrc;
    if (currentSrc) {
      return processImageUrl(currentSrc);
    }
  }
  // Fallback to stored URL
  return button.getAttribute("data-es-utils-url");
}

// Create button container for an image
function createButtonContainer(img) {
  // Don't add buttons if image already has them
  if (img.dataset.esUtilsProcessed === "true") {
    return null;
  }

  // Skip small images - only show buttons if image is at least 20% of window width OR height
  const rect = img.getBoundingClientRect();
  const minWidth = (window.innerWidth * MIN_IMAGE_PERCENT) / 100;
  const minHeight = (window.innerHeight * MIN_IMAGE_PERCENT) / 100;

  if (rect.width < minWidth && rect.height < minHeight) {
    return null;
  }

  // Skip images without valid src
  const src = img.src || img.dataset.src || img.currentSrc;
  if (!src || src.startsWith("data:") || src.includes("blank.gif")) {
    return null;
  }

  // Get processed URL (extract real URL + optimize)
  const processedUrl = processImageUrl(src);

  // Create container
  const container = document.createElement("div");
  container.className = BUTTON_CONTAINER_CLASS;
  container.setAttribute("data-es-utils", "true");
  container._esUtilsImg = img; // Store reference to image

  // Add buttons based on settings
  if (esUtilsSettings.imageDownload) {
    container.appendChild(createButton("download", processedUrl, img));
  }

  if (esUtilsSettings.copyImageUrl) {
    container.appendChild(createButton("copy", processedUrl, img));
  }

  // Watch for src changes on this image
  observeImageSrcChange(img, container);

  // Mark image as processed
  img.dataset.esUtilsProcessed = "true";

  return container;
}

// Setup image wrapper with buttons
function setupImageButtons(img) {
  if (!esUtilsSettings.imageDownload && !esUtilsSettings.copyImageUrl) {
    return;
  }

  const container = createButtonContainer(img);
  if (!container) return;

  // Get parent element and append buttons to it
  let parent = img.parentElement;
  if (!parent) return;

  // Check if parent already has our buttons
  if (parent.classList.contains("es-utils-has-buttons")) {
    // Remove existing container and add new one
    const existingContainer = parent.querySelector(
      `.${BUTTON_CONTAINER_CLASS}`,
    );
    if (existingContainer) {
      existingContainer.remove();
    }
  }

  // Get parent's computed style
  const parentStyle = window.getComputedStyle(parent);

  // Only add position:relative if parent has static positioning
  if (parentStyle.position === "static") {
    parent.style.position = "relative";
  }

  // Append button container to parent element
  parent.appendChild(container);
  parent.classList.add("es-utils-has-buttons");
}

// Download image using utility function
function downloadImage(url) {
  runtimeSendMessage("DOWNLOAD_IMAGE", {
    url: url,
    filename: getImageFilename(url),
  });
}

// Copy image URL to clipboard
async function copyImageUrl(url, button) {
  try {
    await navigator.clipboard.writeText(url);

    // Show feedback
    button.classList.add("es-utils-btn-success");
    const originalHTML = button.innerHTML;
    button.innerHTML = `
         <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="20 6 9 17 4 12"></polyline>
         </svg>
      `;

    setTimeout(() => {
      button.classList.remove("es-utils-btn-success");
      button.innerHTML = originalHTML;
    }, 1500);
  } catch (error) {
    console.error("ES Utils: Failed to copy URL", error);
  }
}

// Observe image src attribute changes
function observeImageSrcChange(img, container) {
  if (img._esUtilsSrcObserver) return; // Already observing

  const srcObserver = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      if (
        mutation.type === "attributes" &&
        (mutation.attributeName === "src" ||
          mutation.attributeName === "data-src")
      ) {
        // Update button URLs when src changes
        const newSrc = img.src || img.dataset.src || img.currentSrc;
        if (newSrc && !newSrc.startsWith("data:")) {
          const newProcessedUrl = processImageUrl(newSrc);
          // Update data attributes on buttons
          container.querySelectorAll(".es-utils-btn").forEach((btn) => {
            btn.setAttribute("data-es-utils-url", newProcessedUrl);
          });
        }
      }
    });
  });

  srcObserver.observe(img, {
    attributes: true,
    attributeFilter: ["src", "data-src", "srcset"],
  });

  img._esUtilsSrcObserver = srcObserver;
}

// Process existing images on page
function processExistingImages() {
  const images = document.querySelectorAll("img");
  images.forEach((img) => {
    if (img.complete && img.naturalWidth > 0) {
      setupImageButtons(img);
    } else {
      img.addEventListener("load", () => setupImageButtons(img), {
        once: true,
      });
    }
  });
}

// Observe for new images and button removal
function observeImages() {
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      // Handle added nodes (new images)
      mutation.addedNodes.forEach((node) => {
        if (node.nodeType === Node.ELEMENT_NODE) {
          // Check if node is an image
          if (node.tagName === "IMG") {
            if (node.complete && node.naturalWidth > 0) {
              setupImageButtons(node);
            } else {
              node.addEventListener("load", () => setupImageButtons(node), {
                once: true,
              });
            }
          }

          // Check for images inside the added node
          const images = node.querySelectorAll?.("img");
          if (images) {
            images.forEach((img) => {
              if (img.complete && img.naturalWidth > 0) {
                setupImageButtons(img);
              } else {
                img.addEventListener("load", () => setupImageButtons(img), {
                  once: true,
                });
              }
            });
          }
        }
      });

      // Handle removed nodes - check if buttons were removed
      mutation.removedNodes.forEach((node) => {
        if (node.nodeType === Node.ELEMENT_NODE) {
          // If our button container was removed, find the image and re-add buttons
          if (node.classList?.contains(BUTTON_CONTAINER_CLASS)) {
            const parent = mutation.target;
            const img = parent.querySelector("img");
            if (img && img.dataset.esUtilsProcessed === "true") {
              // Mark as unprocessed so it can be re-added
              delete img.dataset.esUtilsProcessed;
              // Re-add buttons after a short delay
              setTimeout(() => setupImageButtons(img), 100);
            }
          }
        }
      });
    });
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true,
  });
}

// Remove all button containers
function removeAllButtons() {
  // Remove all button containers
  document
    .querySelectorAll(`.${BUTTON_CONTAINER_CLASS}`)
    .forEach((el) => el.remove());

  // Remove processed markers
  document.querySelectorAll("[data-es-utils-processed]").forEach((el) => {
    delete el.dataset.esUtilsProcessed;
  });

  // Remove our CSS classes from parent elements (don't remove elements)
  document.querySelectorAll(".es-utils-has-buttons").forEach((el) => {
    el.classList.remove("es-utils-has-buttons");
  });

  // Remove observers from images
  document.querySelectorAll("img").forEach((img) => {
    if (img._esUtilsSrcObserver) {
      img._esUtilsSrcObserver.disconnect();
      delete img._esUtilsSrcObserver;
    }
  });
}

// Update all existing buttons with new settings
function updateAllButtons() {
  // Remove existing buttons
  document
    .querySelectorAll(`.${BUTTON_CONTAINER_CLASS}`)
    .forEach((el) => el.remove());

  // Remove processed markers so images can be reprocessed
  document.querySelectorAll("[data-es-utils-processed]").forEach((el) => {
    delete el.dataset.esUtilsProcessed;
  });

  // Reprocess all images
  processExistingImages();
}

// Initialize after page is fully loaded (including all images and resources)
if (document.readyState === "complete") {
  initImageUtils();
} else {
  window.addEventListener("load", initImageUtils);
}
