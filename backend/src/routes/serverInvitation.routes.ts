import { Router } from 'express';
import { getInvitations, acceptInvitation, declineInvitation } from '../controllers/serverInvitation.controller';
import { protect } from '../middleware/auth.middleware';

const router = Router();

router.use(protect);

router.get('/', getInvitations);
router.post('/:id/accept', acceptInvitation);
router.post('/:id/decline', declineInvitation);

export default router;
