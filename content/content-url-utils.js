"use strict";

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
      // Format: https://drive.google.com/u/X/drive-usercontent/FILE_ID=w400-h380...
      const driveUsercontentMatch = url.match(/\/drive-usercontent\/([^=?]+)/);
      if (driveUsercontentMatch) {
        return `https://drive.google.com/uc?export=download&id=${driveUsercontentMatch[1]}`;
      }

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

    // Flipkart - get higher quality image
    if (urlObj.hostname.includes("flixcart.com")) {
      // Pattern: https://rukminim2.flixcart.com/image/100/100/path...
      // Replace small dimensions with larger ones for better quality
      let optimizedUrl = url.replace(
        /\/image\/\d+\/\d+\//,
        "/image/2000/2000/",
      );
      // Also remove crop parameter if present for full image
      optimizedUrl = optimizedUrl.replace(/([?&])crop=false/gi, "$1crop=false");
      return optimizedUrl;
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
