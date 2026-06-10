import { Router } from 'express';
import { protect } from '../middleware/auth.middleware';
import { uploadMiddleware } from '../middleware/upload';
import { uploadFiles } from '../controllers/upload.controller';

const router = Router();

router.use(protect);

// Support multiple file uploads under the key "attachments"
// E.g., formData.append("attachments", file1); formData.append("attachments", file2);
router.post('/', uploadMiddleware.array('attachments', 10), uploadFiles);

export default router;
