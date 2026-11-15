// Getting a phone photo ready to upload. The maths and the checks are pure (tested without a browser);
// compressImage is the only part that needs one.
//
// Why re-encode in the browser: it shrinks a 6 MB camera photo to a few hundred KB, and drawing it onto a
// canvas drops everything that isn't pixels (EXIF, GPS location, camera serial) and bakes in the rotation.

export const MAX_SIDE = 2000;
export const JPEG_QUALITY = 0.82;
// What we will even try to decode. Camera originals are 3-15 MB; this stops a huge file freezing the tab.
export const MAX_INPUT_BYTES = 30 * 1024 * 1024;
// What the server accepts per photo by default (MEDIA_MAX_BYTES); the real limit comes from /media/status.
export const DEFAULT_MAX_UPLOAD_BYTES = 8 * 1024 * 1024;

const TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif']);
const EXTENSIONS = /\.(jpe?g|png|webp|heic|heif)$/i;

export class ImageError extends Error {
  constructor(message) { super(message); this.name = 'ImageError'; }
}

/** Largest size that fits in a max x max box, same shape, never enlarged. */
export function fitWithin(width, height, max = MAX_SIDE) {
  if (!(width > 0) || !(height > 0)) return { width: 1, height: 1 };
  const scale = Math.min(1, max / Math.max(width, height));
  return { width: Math.max(1, Math.round(width * scale)), height: Math.max(1, Math.round(height * scale)) };
}

/** Returns a friendly message if the file can't be used, otherwise null. */
export function validateImageFile(file, { maxBytes = MAX_INPUT_BYTES } = {}) {
  if (!file) return 'Choose a photo first.';
  const typeOk = TYPES.has(String(file.type || '').toLowerCase()) || (!file.type && EXTENSIONS.test(file.name || ''));
  if (!typeOk) return 'That file isn’t a photo. Please choose a JPEG, PNG, WebP or HEIC image.';
  if (!(file.size > 0)) return 'That photo looks empty. Please try another.';
  if (file.size > maxBytes) return `That photo is too big (over ${Math.round(maxBytes / (1024 * 1024))} MB). Please choose a smaller one.`;
  return null;
}

// Browser parts, replaceable in tests.
const browser = {
  async decode(file) {
    if (typeof createImageBitmap === 'function') {
      try {
        // 'from-image' applies the camera's rotation, so a portrait photo isn't uploaded sideways.
        const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
        return { source: bitmap, width: bitmap.width, height: bitmap.height, release: () => bitmap.close?.() };
      } catch { /* fall back to an <img>, which also applies the rotation */ }
    }
    const url = URL.createObjectURL(file);
    try {
      const img = new Image();
      img.decoding = 'async';
      await new Promise((resolve, reject) => { img.onload = resolve; img.onerror = reject; img.src = url; });
      return { source: img, width: img.naturalWidth, height: img.naturalHeight, release() {} };
    } finally {
      URL.revokeObjectURL(url);
    }
  },
  canvas(width, height) {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    return canvas;
  },
  toBlob: (canvas, type, quality) => new Promise((resolve) => canvas.toBlob(resolve, type, quality)),
};

/** Decodes, shrinks to at most 2000 px and re-encodes as JPEG. Resolves with a Blob. */
export async function compressImage(file, { maxSide = MAX_SIDE, quality = JPEG_QUALITY, env = browser } = {}) {
  let decoded;
  try {
    decoded = await env.decode(file);
  } catch {
    throw new ImageError('Your browser couldn’t read that photo. Try a JPEG or PNG, or take it again.');
  }
  try {
    if (!(decoded.width > 0 && decoded.height > 0)) throw new ImageError('That photo has no picture in it.');
    const { width, height } = fitWithin(decoded.width, decoded.height, maxSide);
    const canvas = env.canvas(width, height);
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#ffffff'; // JPEG has no transparency: a transparent PNG would turn black
    ctx.fillRect(0, 0, width, height);
    ctx.drawImage(decoded.source, 0, 0, width, height);
    const blob = await env.toBlob(canvas, 'image/jpeg', quality);
    if (!blob || !blob.size) throw new ImageError('Couldn’t prepare that photo. Please try another.');
    return blob;
  } finally {
    decoded.release?.();
  }
}
