import { Router } from 'express';
import { getMessages } from '../controllers/message.controller';
import { protect } from '../middleware/auth.middleware';

const router = Router();

router.use(protect); // All message routes protected

router.get('/:channelId', getMessages);

export default router;
