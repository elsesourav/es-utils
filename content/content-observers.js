"use strict";

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
          // If our button container was removed, just mark image as unprocessed
          // so it can be re-added on next manual interaction or page update
          if (node.classList?.contains(BUTTON_CONTAINER_CLASS)) {
            const parent = mutation.target;
            const img = parent.querySelector("img");
            if (img && img.dataset.esUtilsProcessed === "true") {
              delete img.dataset.esUtilsProcessed;
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
