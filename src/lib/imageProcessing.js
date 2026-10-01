// One place for every photo the app uploads (profile photos, report
// screenshots, job photos). Makes iPhone/Android photos and screenshots work
// everywhere:
//   - HEIC/HEIF (iPhone default) is converted to JPEG — browsers can't render it
//   - resized so the longest side is at most 2000px
//   - re-encoded through a canvas, which drops ALL EXIF metadata, including the
//     GPS location an iPhone attaches
//   - uploaded with progress and one automatic retry
//
// Photos upload to public storage so they render in chat, email receipts and
// admin review without signing.
import { base44 } from "@/api/base44Client";

const MAX_EDGE = 2000;
const JPEG_QUALITY = 0.85;
const MAX_BYTES = 25 * 1024 * 1024;

function isHeic(file) {
  const type = (file.type || "").toLowerCase();
  const name = (file.name || "").toLowerCase();
  return type.includes("heic") || type.includes("heif") || /\.(heic|heif)$/.test(name);
}

async function decode(file) {
  // createImageBitmap decodes HEIC where the browser supports it (iOS/macOS
  // Safari); the <img> fallback covers everything else.
  if (typeof createImageBitmap === "function") {
    try {
      return await createImageBitmap(file);
    } catch {
      /* fall through to the <img> path */
    }
  }
  const url = URL.createObjectURL(file);
  try {
    return await new Promise((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error("decode"));
      el.src = url;
    });
  } finally {
    URL.revokeObjectURL(url);
  }
}

/** Converts, resizes and compresses an image, stripping location metadata. */
export async function prepareImage(file) {
  if (!file) throw new Error("No file selected.");
  if (!String(file.type || "").startsWith("image/") && !isHeic(file)) {
    throw new Error("Please choose an image file.");
  }
  if (file.size > MAX_BYTES) throw new Error("That photo is too large (max 25MB).");

  let bitmap;
  try {
    bitmap = await decode(file);
  } catch {
    throw new Error(
      isHeic(file)
        ? "This iPhone photo format (HEIC) couldn't be converted on this device. Try Settings → Camera → Formats → Most Compatible, or take a screenshot and upload that instead."
        : "We couldn't read that image. Please try another one."
    );
  }

  const w = bitmap.width || bitmap.naturalWidth;
  const h = bitmap.height || bitmap.naturalHeight;
  if (!w || !h) throw new Error("We couldn't read that image. Please try another one.");

  const scale = Math.min(1, MAX_EDGE / Math.max(w, h));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(w * scale);
  canvas.height = Math.round(h * scale);
  const ctx = canvas.getContext("2d");
  // White base so transparent PNGs/screenshots don't turn black in the JPEG.
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  if (bitmap.close) bitmap.close();

  const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", JPEG_QUALITY));
  if (!blob) throw new Error("We couldn't process that image. Please try another one.");

  const base = (file.name || "photo").replace(/\.[^.]+$/, "").slice(0, 40) || "photo";
  return new File([blob], `${base}.jpg`, { type: "image/jpeg" });
}

async function withProgress(task, onProgress) {
  const started = Date.now();
  const tick = setInterval(() => {
    onProgress?.(Math.min(95, Math.round(((Date.now() - started) / 2500) * 100)));
  }, 150);
  try {
    return await task();
  } finally {
    clearInterval(tick);
  }
}

/**
 * Uploads one photo: prepare → upload, with progress and a single retry.
 * Returns the public URL.
 */
export async function uploadPhoto(file, { onProgress } = {}) {
  const prepared = await prepareImage(file);

  let lastError;
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      onProgress?.(0);
      const res = await withProgress(
        () => base44.integrations.Core.UploadPublicFile({ file: prepared }),
        onProgress
      );
      onProgress?.(100);
      return res.file_url;
    } catch (err) {
      lastError = err;
    }
  }
  throw new Error(lastError?.message || "Upload failed. Check your connection and try again.");
}

/** Uploads several photos, reporting overall progress. */
export async function uploadPhotos(files, { onProgress, max = 6 } = {}) {
  const list = Array.from(files || []).slice(0, max);
  const urls = [];
  for (let i = 0; i < list.length; i++) {
    const url = await uploadPhoto(list[i], {
      onProgress: (pct) => onProgress?.(Math.round(((i + pct / 100) / list.length) * 100)),
    });
    urls.push(url);
  }
  return urls;
}