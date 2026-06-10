import { Router } from 'express';
import { getInvite, joinInvite } from '../controllers/invite.controller';
import { protect } from '../middleware/auth.middleware';

const router = Router();

// Public route to view invite details on landing page
router.get('/:code', getInvite);

// Protected route to join via invite
router.post('/:code/join', protect, joinInvite);

export default router;
