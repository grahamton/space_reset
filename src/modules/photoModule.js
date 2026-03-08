/**
 * photoModule - Manages before/after photo capture and storage
 */

const STORAGE_KEY_PHOTOS = 'session_photos';
const MAX_PHOTOS_PER_SESSION = 2; // before & after

/**
 * Store before photo for current session
 */
export const saveBeforePhoto = (photoDataUrl) => {
  try {
    const photos = loadPhotos();
    photos.before = {
      data: photoDataUrl,
      savedAt: Date.now()
    };
    localStorage.setItem(STORAGE_KEY_PHOTOS, JSON.stringify(photos));
    return true;
  } catch (error) {
    console.error('Failed to save before photo:', error);
    return false;
  }
};

/**
 * Store after photo for current session
 */
export const saveAfterPhoto = (photoDataUrl) => {
  try {
    const photos = loadPhotos();
    photos.after = {
      data: photoDataUrl,
      savedAt: Date.now()
    };
    localStorage.setItem(STORAGE_KEY_PHOTOS, JSON.stringify(photos));
    return true;
  } catch (error) {
    console.error('Failed to save after photo:', error);
    return false;
  }
};

/**
 * Load current session photos
 */
export const loadPhotos = () => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY_PHOTOS);
    return stored ? JSON.parse(stored) : { before: null, after: null };
  } catch (error) {
    console.error('Failed to load photos:', error);
    return { before: null, after: null };
  }
};

/**
 * Check if both before and after photos exist
 */
export const hasComparisonPhotos = () => {
  const photos = loadPhotos();
  return !!(photos.before?.data && photos.after?.data);
};

/**
 * Clear current session photos
 */
export const clearSessionPhotos = () => {
  try {
    localStorage.removeItem(STORAGE_KEY_PHOTOS);
    return true;
  } catch (error) {
    console.error('Failed to clear photos:', error);
    return false;
  }
};

/**
 * Get photo data URLs for display
 */
export const getPhotoComparison = () => {
  const photos = loadPhotos();
  return {
    before: photos.before?.data || null,
    after: photos.after?.data || null,
    hasComparison: !!(photos.before?.data && photos.after?.data)
  };
};

/**
 * Archive photos with session (called after completion)
 */
export const archiveSessionPhotos = (sessionId) => {
  try {
    const photos = loadPhotos();
    const archive = loadPhotoArchive();

    if (photos.before || photos.after) {
      archive[sessionId] = {
        before: photos.before || null,
        after: photos.after || null,
        archivedAt: Date.now()
      };

      localStorage.setItem(
        'session_photo_archive',
        JSON.stringify(archive)
      );
    }

    clearSessionPhotos();
    return true;
  } catch (error) {
    console.error('Failed to archive photos:', error);
    return false;
  }
};

/**
 * Load photo archive (all past session photos)
 */
export const loadPhotoArchive = () => {
  try {
    const stored = localStorage.getItem('session_photo_archive');
    return stored ? JSON.parse(stored) : {};
  } catch (error) {
    console.error('Failed to load photo archive:', error);
    return {};
  }
};

/**
 * Get photos for specific session
 */
export const getSessionPhotos = (sessionId) => {
  const archive = loadPhotoArchive();
  return archive[sessionId] || { before: null, after: null };
};

/**
 * Convert File to Data URL
 */
export const fileToDataUrl = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

/**
 * Compress image before storing (reduce file size)
 * Uses canvas to reduce dimensions & quality
 */
export const compressImage = (dataUrl, maxWidth = 800, maxHeight = 800, quality = 0.7) => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      let width = img.width;
      let height = img.height;

      if (width > height) {
        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }
      } else {
        if (height > maxHeight) {
          width = Math.round((width * maxHeight) / height);
          height = maxHeight;
        }
      }

      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, width, height);

      const compressedUrl = canvas.toDataURL('image/jpeg', quality);
      resolve(compressedUrl);
    };
    img.onerror = reject;
    img.src = dataUrl;
  });
};
