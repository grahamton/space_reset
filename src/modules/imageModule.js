/**
 * imageModule - Shrinks a photo to what Claude can use before it's uploaded.
 *
 * Phone cameras shoot well past Claude's vision limit (2576px on the long edge,
 * about 3.75 megapixels); the API would downscale anything larger anyway. Doing
 * it here means any camera photo works, and the upload is a few hundred KB
 * instead of several MB.
 */

export const MAX_EDGE = 2576;
export const MAX_PIXELS = 3_750_000;
const JPEG_QUALITY = 0.85;

// What the worker accepts; anything else is re-encoded as JPEG.
const PASSTHROUGH_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
// Under this, a photo already inside the pixel limits is sent untouched.
const PASSTHROUGH_MAX_BYTES = 3 * 1024 * 1024;

/** The largest size within both limits that keeps the aspect ratio. Never upscales. */
export const fitWithinLimits = (width, height) => {
  const scale = Math.min(
    1,
    MAX_EDGE / Math.max(width, height),
    Math.sqrt(MAX_PIXELS / (width * height))
  );
  return {
    width: Math.max(1, Math.floor(width * scale)),
    height: Math.max(1, Math.floor(height * scale))
  };
};

/**
 * @param {File} file - An image picked or captured by the user
 * @returns {Promise<File>} The original file if it already fits, otherwise a JPEG within the limits
 * @throws {Error} with a message suitable for display when the image can't be decoded
 */
export const prepareImageForUpload = async (file) => {
  let bitmap;
  try {
    // 'from-image' applies EXIF rotation, so portrait photos stay upright.
    bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
  } catch {
    throw new Error("Couldn't open that photo. Try a different one.");
  }

  try {
    const target = fitWithinLimits(bitmap.width, bitmap.height);
    const fits = target.width === bitmap.width && target.height === bitmap.height;
    if (fits && PASSTHROUGH_TYPES.includes(file.type) && file.size <= PASSTHROUGH_MAX_BYTES) {
      return file;
    }

    const canvas = document.createElement('canvas');
    canvas.width = target.width;
    canvas.height = target.height;
    const context = canvas.getContext('2d');
    context.imageSmoothingQuality = 'high';
    context.drawImage(bitmap, 0, 0, target.width, target.height);

    const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', JPEG_QUALITY));
    if (!blob) throw new Error("Couldn't process that photo. Try a different one.");

    const name = file.name.replace(/\.[^.]*$/, '') || 'photo';
    return new File([blob], `${name}.jpg`, { type: 'image/jpeg' });
  } finally {
    bitmap.close?.();
  }
};
