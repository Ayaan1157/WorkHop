/**
 * File upload validation & image optimization utilities for WorkHop.
 * Enforces standardized upload restrictions (5 MB limit) across the platform.
 */

export const MAX_PORTFOLIO_IMAGE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB
export const MAX_PORTFOLIO_IMAGE_SIZE_MB = 5;

export const MAX_ATTACHMENT_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB
export const MAX_ATTACHMENT_SIZE_MB = 5;

/**
 * Formats byte size into human readable string (e.g. 2.4 MB, 320 KB)
 */
export function formatFileSize(bytes) {
  if (!bytes || isNaN(bytes) || bytes <= 0) return "0 B";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Validates an image file's type and size limit.
 * @param {File} file
 * @param {number} maxMB - Maximum size in MB (defaults to 5MB)
 * @returns {{ valid: boolean, error: string | null }}
 */
export function validateImageFile(file, maxMB = MAX_PORTFOLIO_IMAGE_SIZE_MB) {
  if (!file) {
    return { valid: false, error: "No file selected." };
  }

  const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
  const allowedExtensions = [".jpg", ".jpeg", ".png", ".webp", ".gif"];
  const fileName = (file.name || "").toLowerCase();

  const isAllowedType =
    (file.type && allowedTypes.includes(file.type)) ||
    allowedExtensions.some((ext) => fileName.endsWith(ext));

  if (!isAllowedType) {
    return {
      valid: false,
      error: "Unsupported format. Please upload JPG, PNG, WEBP, or GIF.",
    };
  }

  const maxBytes = maxMB * 1024 * 1024;
  if (file.size > maxBytes) {
    return {
      valid: false,
      error: `File is too large (${formatFileSize(file.size)}). Maximum allowed size is ${maxMB} MB.`,
    };
  }

  return { valid: true, error: null };
}

/**
 * Validates generic attachment files (PDF, images, documents).
 * @param {File} file
 * @param {number} maxMB - Maximum size in MB (defaults to 5MB)
 * @returns {{ valid: boolean, error: string | null }}
 */
export function validateAttachmentFile(file, maxMB = MAX_ATTACHMENT_SIZE_MB) {
  if (!file) {
    return { valid: false, error: "No file selected." };
  }

  const maxBytes = maxMB * 1024 * 1024;
  if (file.size > maxBytes) {
    return {
      valid: false,
      error: `Attachment is too large (${formatFileSize(file.size)}). Maximum allowed size is ${maxMB} MB.`,
    };
  }

  return { valid: true, error: null };
}

/**
 * Optimizes, resizes, and converts images via HTML5 canvas to ensure
 * sharp visual quality while keeping the Base64/dataURL storage compact
 * (typically ~150-350 KB instead of several megabytes).
 *
 * @param {File} file
 * @param {{ maxWidth?: number, maxHeight?: number, quality?: number }} options
 * @returns {Promise<{ dataUrl: string, fileName: string, fileSize: number, originalSize: number, width: number | null, height: number | null }>}
 */
export function compressImage(
  file,
  { maxWidth = 1600, maxHeight = 1600, quality = 0.85 } = {}
) {
  return new Promise((resolve, reject) => {
    if (!file) return reject(new Error("No file provided"));

    // If SVG or animated GIF, read as raw Data URL directly to preserve animation/vector
    if (file.type === "image/svg+xml" || file.type === "image/gif") {
      const reader = new FileReader();
      reader.onload = () =>
        resolve({
          dataUrl: reader.result,
          fileName: file.name,
          fileSize: file.size,
          originalSize: file.size,
          width: null,
          height: null,
        });
      reader.onerror = () => reject(new Error("Failed to read image file"));
      reader.readAsDataURL(file);
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        let width = img.naturalWidth || img.width;
        let height = img.naturalHeight || img.height;

        // Proportional downscale if exceeding bounding box
        if (width > maxWidth || height > maxHeight) {
          if (width / height > maxWidth / maxHeight) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          } else {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");

        if (!ctx) {
          // Canvas 2d context unavailable, fallback to raw Data URL
          return resolve({
            dataUrl: e.target.result,
            fileName: file.name,
            fileSize: file.size,
            originalSize: file.size,
            width,
            height,
          });
        }

        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = "high";
        ctx.drawImage(img, 0, 0, width, height);

        // Keep PNG transparency if original is PNG, otherwise output high-efficiency JPEG
        const outputMime = file.type === "image/png" ? "image/png" : "image/jpeg";
        const dataUrl = canvas.toDataURL(outputMime, quality);

        resolve({
          dataUrl,
          fileName: file.name,
          fileSize: Math.round((dataUrl.length * 3) / 4), // Approximate binary bytes
          originalSize: file.size,
          width,
          height,
        });
      };

      img.onerror = () => {
        // In case image decoding fails, resolve with original data
        resolve({
          dataUrl: e.target.result,
          fileName: file.name,
          fileSize: file.size,
          originalSize: file.size,
          width: null,
          height: null,
        });
      };

      img.src = e.target.result;
    };

    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsDataURL(file);
  });
}
