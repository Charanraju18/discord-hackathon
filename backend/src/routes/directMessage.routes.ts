import { Router } from 'express';
import { protect } from '../middleware/auth.middleware';
import {
  startConversation,
  getConversations,
  getMessages,
  sendMessage,
  editMessage,
  deleteMessage
} from '../controllers/directMessage.controller';

const router = Router();

router.use(protect);

router.post('/start', startConversation);
router.get('/', getConversations);
router.get('/:conversationId/messages', getMessages);
router.post('/:conversationId/messages', sendMessage);
router.patch('/messages/:messageId', editMessage);
router.delete('/messages/:messageId', deleteMessage);

export default router;
