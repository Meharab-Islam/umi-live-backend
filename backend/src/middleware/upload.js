import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ensure base upload directory exists
const baseUploadDir = path.join(__dirname, '../../uploads');
if (!fs.existsSync(baseUploadDir)) {
  fs.mkdirSync(baseUploadDir, { recursive: true });
}

// Multer disk storage engine
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const rawCategory = req.uploadCategory || req.query?.category || req.body?.category || 'general';
    const safeCategory = rawCategory.replace(/[^a-zA-Z0-9_-]/g, '') || 'general';
    req.uploadCategory = safeCategory;
    const targetDir = path.join(baseUploadDir, safeCategory);
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }
    cb(null, targetDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    const safeBase = path
      .basename(file.originalname, ext)
      .replace(/[^a-zA-Z0-9_-]/g, '_')
      .substring(0, 50);
    cb(null, `${safeBase || 'file'}_${uniqueSuffix}${ext}`);
  },
});

// File validation filter
const fileFilter = (req, file, cb) => {
  const allowedExtensions = [
    // Image formats
    '.png',
    '.jpg',
    '.jpeg',
    '.webp',
    '.gif',
    '.svg',
    '.heic',
    '.heif',
    // SVGA animation format
    '.svga',
    // Audio formats
    '.mp3',
    '.wav',
    '.aac',
    '.ogg',
    '.m4a',
    // Video formats
    '.mp4',
    '.mov',
    '.avi',
    '.mkv',
    '.webm',
    '.flv',
    '.m4v',
    '.3gp',
  ];

  const ext = path.extname(file.originalname).toLowerCase();
  if (allowedExtensions.includes(ext)) {
    cb(null, true);
  } else {
    cb(
      new Error(
        `File format '${ext}' is not supported. Allowed formats: ${allowedExtensions.join(', ')}`
      ),
      false
    );
  }
};

export const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 100 * 1024 * 1024, // 100 MB max for videos, audio, images
  },
});

/**
 * Mobile Avatar Upload Middleware
 * Automatically handles multipart/form-data for registration & profile updates.
 * Supports file fields: 'avatar', 'file', or 'image'.
 * Passes through transparently if request is application/json or no file is attached.
 */
export const optionalAvatarUpload = (req, res, next) => {
  const contentType = req.headers['content-type'] || '';
  if (contentType.includes('multipart/form-data')) {
    req.uploadCategory = 'avatars';
    return upload.any()(req, res, (err) => {
      if (err) {
        return res.status(400).json({
          success: false,
          message: err.message || 'Avatar upload failed.',
        });
      }
      if (req.files && req.files.length > 0) {
        req.file = req.files[0];
      }
      next();
    });
  }
  next();
};

/**
 * Mobile Live Room Background / Media Upload Middleware
 * Automatically handles multipart/form-data for room cover/background thumbnail updates.
 */
export const optionalRoomMediaUpload = (req, res, next) => {
  const contentType = req.headers['content-type'] || '';
  if (contentType.includes('multipart/form-data')) {
    req.uploadCategory = 'rooms';
    return upload.any()(req, res, (err) => {
      if (err) {
        return res.status(400).json({
          success: false,
          message: err.message || 'Room media upload failed.',
        });
      }
      if (req.files && req.files.length > 0) {
        req.file = req.files[0];
      }
      next();
    });
  }
  next();
};

/**
 * Mobile Feed Post Media Upload Middleware
 * Handles single or multiple media attachments (images, videos, audio).
 * Supports any field name and multiple file uploads.
 * Attaches structured array to req.uploadedMedia and sets req.uploadCategory to 'posts'.
 */
export const optionalFeedMediaUpload = (req, res, next) => {
  const contentType = req.headers['content-type'] || '';
  if (contentType.includes('multipart/form-data')) {
    req.uploadCategory = 'posts';
    return upload.any()(req, res, (err) => {
      if (err) {
        return res.status(400).json({
          success: false,
          message: err.message || 'Media upload failed.',
        });
      }

      const allFiles = Array.isArray(req.files) ? req.files : [];
      const videoExts = ['.mp4', '.mov', '.avi', '.mkv', '.webm', '.flv', '.m4v', '.3gp'];
      const audioExts = ['.mp3', '.wav', '.aac', '.ogg', '.m4a'];

      req.uploadedMedia = allFiles.map((f, idx) => {
        const ext = path.extname(f.originalname).toLowerCase();
        let mType = 'image';
        if (videoExts.includes(ext)) {
          mType = 'video';
        } else if (audioExts.includes(ext)) {
          mType = 'audio';
        }

        return {
          media_type: mType,
          media_url: `/uploads/posts/${f.filename}`,
          filename: f.filename,
          original_name: f.originalname,
          size: f.size,
          display_order: idx + 1,
        };
      });

      next();
    });
  }
  next();
};

/**
 * Mobile Chat Media Upload Middleware
 * Handles single or multiple media attachments (images, videos, audio) for private chats.
 * Supports any field names and sets category to 'chat'.
 */
export const optionalChatMediaUpload = (req, res, next) => {
  const contentType = req.headers['content-type'] || '';
  if (contentType.includes('multipart/form-data')) {
    req.uploadCategory = 'chat';
    return upload.any()(req, res, (err) => {
      if (err) {
        return res.status(400).json({
          success: false,
          message: err.message || 'Chat media upload failed.',
        });
      }

      const allFiles = Array.isArray(req.files) ? req.files : [];
      const videoExts = ['.mp4', '.mov', '.avi', '.mkv', '.webm', '.flv', '.m4v', '.3gp'];
      const audioExts = ['.mp3', '.wav', '.aac', '.ogg', '.m4a'];

      req.uploadedMedia = allFiles.map((f, idx) => {
        const ext = path.extname(f.originalname).toLowerCase();
        let mType = 'image';
        if (videoExts.includes(ext)) {
          mType = 'video';
        } else if (audioExts.includes(ext)) {
          mType = 'audio';
        }

        return {
          media_type: mType,
          media_url: `/uploads/chat/${f.filename}`,
          filename: f.filename,
          original_name: f.originalname,
          size: f.size,
          display_order: idx + 1,
        };
      });

      next();
    });
  }
  next();
};
