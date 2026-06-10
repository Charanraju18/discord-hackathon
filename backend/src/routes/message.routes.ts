import { Router } from 'express';
import { getMessages, editMessage, deleteMessage } from '../controllers/message.controller';
import { protect } from '../middleware/auth.middleware';

const router = Router();

router.use(protect); // All message routes protected

router.get('/:channelId', getMessages);
router.put('/:id', editMessage);
router.delete('/:id', deleteMessage);

export default router;
