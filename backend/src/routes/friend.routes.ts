import { Router } from 'express';
import { protect } from '../middleware/auth.middleware';
import {
  sendRequest,
  getRequests,
  acceptRequest,
  rejectRequest,
  getFriends,
  removeFriend
} from '../controllers/friend.controller';

const router = Router();

router.use(protect);

router.post('/request', sendRequest);
router.get('/requests', getRequests);
router.post('/request/:id/accept', acceptRequest);
router.post('/request/:id/reject', rejectRequest);
router.get('/', getFriends);
router.delete('/:friendId', removeFriend);

export default router;
