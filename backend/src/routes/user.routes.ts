import { Router } from 'express';
import { searchUsers } from '../controllers/user.controller';
import { protect } from '../middleware/auth.middleware';

const router = Router();

router.use(protect);

router.get('/search', searchUsers);

export default router;
