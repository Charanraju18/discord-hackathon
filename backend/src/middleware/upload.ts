import multer from 'multer';

// Use memory storage to process files without saving to disk locally
const storage = multer.memoryStorage();

// Set an absolute upper limit to prevent memory overflow (100 MB max for videos)
export const uploadMiddleware = multer({
  storage,
  limits: {
    fileSize: 100 * 1024 * 1024, // 100 MB max allowed (will be filtered more strictly in controller)
  },
});
