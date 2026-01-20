"use strict";

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

  // Skip small images - only show buttons if image is at least 15% of window width OR height
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
