import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Base directory for all file uploads: backend/uploads
const baseUploadsDir = path.resolve(__dirname, '../../uploads');

/**
 * Safely delete a single file from the uploads storage.
 * Handles both relative paths ('/uploads/chat/img.jpg') and full URLs ('http://localhost:5050/uploads/chat/img.jpg').
 * Protects against directory traversal.
 * 
 * @param {string} fileUrlOrPath 
 * @returns {boolean} True if file was successfully deleted, false otherwise.
 */
export function deleteFileFromStorage(fileUrlOrPath) {
  if (!fileUrlOrPath || typeof fileUrlOrPath !== 'string') {
    return false;
  }

  try {
    let cleanPath = fileUrlOrPath.trim();
    if (!cleanPath) return false;

    // If it's a full URL, extract the pathname
    if (cleanPath.startsWith('http://') || cleanPath.startsWith('https://')) {
      try {
        const parsed = new URL(cleanPath);
        cleanPath = parsed.pathname;
      } catch {
        // Fallback: strip domain prefix
        cleanPath = cleanPath.replace(/^https?:\/\/[^/]+/i, '');
      }
    }

    // Strip leading /uploads or uploads
    cleanPath = cleanPath.replace(/^\/?uploads\/?/i, '');

    if (!cleanPath) return false;

    // Resolve absolute path and guard against directory traversal
    const targetPath = path.resolve(baseUploadsDir, cleanPath);
    if (!targetPath.startsWith(baseUploadsDir)) {
      console.warn(`[FileStorage] Security guard blocked attempt to delete path outside uploads: ${targetPath}`);
      return false;
    }

    if (fs.existsSync(targetPath)) {
      const stat = fs.statSync(targetPath);
      if (stat.isFile()) {
        fs.unlinkSync(targetPath);
        console.log(`[FileStorage] ✅ Deleted file from storage: ${targetPath}`);
        return true;
      }
    }
  } catch (err) {
    console.warn(`[FileStorage] Error deleting file (${fileUrlOrPath}):`, err.message);
  }

  return false;
}

/**
 * Recursively parse, collect, and delete multiple media files from storage.
 * Supports strings, arrays, JSON strings, or objects containing media_url / thumbnail_url.
 * 
 * @param {Array<string|object>|string} items 
 * @returns {number} Count of successfully deleted files.
 */
export function deleteMultipleFilesFromStorage(items) {
  if (!items) return 0;

  const urlSet = new Set();

  function collectUrls(value) {
    if (!value) return;

    if (typeof value === 'string') {
      const trimmed = value.trim();
      if (!trimmed) return;

      // Check if it's a JSON array or object
      if ((trimmed.startsWith('[') && trimmed.endsWith(']')) || (trimmed.startsWith('{') && trimmed.endsWith('}'))) {
        try {
          const parsed = JSON.parse(trimmed);
          collectUrls(parsed);
          return;
        } catch {
          // Treat as regular string if not valid JSON
        }
      }

      if (trimmed.includes('/uploads/')) {
        urlSet.add(trimmed);
      }
      return;
    }

    if (Array.isArray(value)) {
      for (const el of value) {
        collectUrls(el);
      }
      return;
    }

    if (typeof value === 'object') {
      if (value.media_url) collectUrls(value.media_url);
      if (value.thumbnail_url) collectUrls(value.thumbnail_url);
      if (value.url) collectUrls(value.url);
      if (value.file_path) collectUrls(value.file_path);
      if (value.path) collectUrls(value.path);
      if (value.background_image) collectUrls(value.background_image);
      if (value.media) collectUrls(value.media);
    }
  }

  collectUrls(items);

  let deletedCount = 0;
  for (const url of urlSet) {
    if (deleteFileFromStorage(url)) {
      deletedCount++;
    }
  }

  return deletedCount;
}
