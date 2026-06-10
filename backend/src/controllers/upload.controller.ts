import { Request, Response } from 'express';
import cloudinary from '../config/cloudinary';
import { Readable } from 'stream';

const MB = 1024 * 1024;
const LIMITS = {
  image: 10 * MB,
  video: 100 * MB,
  document: 25 * MB,
  archive: 25 * MB,
};

const ALLOWED_TYPES = {
  image: ['image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'image/webp'],
  video: ['video/mp4', 'video/webm', 'video/quicktime'],
  document: [
    'application/pdf', 
    'text/plain', 
    'application/msword', 
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation'
  ],
  archive: [
    'application/zip',
    'application/x-zip-compressed',
    'application/x-rar-compressed'
  ]
};

const getFileType = (mimeType: string): keyof typeof LIMITS | null => {
  for (const [type, mimes] of Object.entries(ALLOWED_TYPES)) {
    if (mimes.includes(mimeType)) {
      return type as keyof typeof LIMITS;
    }
  }
  return null;
};

export const uploadFiles = async (req: Request, res: Response): Promise<void> => {
  try {
    const files = req.files as Express.Multer.File[];
    if (!files || files.length === 0) {
      res.status(400).json({ success: false, message: 'No files provided' });
      return;
    }

    const uploadedAttachments = [];

    // Process files sequentially or in parallel
    // For large files, sequential might prevent memory spikes during streaming
    for (const file of files) {
      const typeCategory = getFileType(file.mimetype);
      
      if (!typeCategory) {
        res.status(400).json({ success: false, message: `Unsupported file type: ${file.mimetype}` });
        return;
      }

      const limit = LIMITS[typeCategory];
      if (file.size > limit) {
        res.status(400).json({ success: false, message: `File size exceeds limit for ${typeCategory} (${limit / MB}MB)` });
        return;
      }

      const resourceType = typeCategory === 'image' || typeCategory === 'video' ? typeCategory : 'raw';

      // Promise wrapper for stream upload
      const uploadResult = await new Promise<any>((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
          {
            resource_type: resourceType,
            folder: 'discord_attachments',
            // Cloudinary auto-generates a public_id if not provided
          },
          (error, result) => {
            if (error) return reject(error);
            resolve(result);
          }
        );

        const readableStream = new Readable();
        readableStream.push(file.buffer);
        readableStream.push(null);
        readableStream.pipe(uploadStream);
      });

      uploadedAttachments.push({
        url: uploadResult.secure_url,
        publicId: uploadResult.public_id,
        fileName: file.originalname,
        fileSize: file.size,
        mimeType: file.mimetype,
        resourceType: typeCategory, // store our category to easily render it on frontend
        uploadedAt: new Date()
      });
    }

    res.status(201).json({ success: true, data: uploadedAttachments });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ success: false, message: 'Server error during upload' });
  }
};
