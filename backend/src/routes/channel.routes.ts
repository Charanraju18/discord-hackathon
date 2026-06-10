import { Router } from 'express';
import { getChannels, createChannel } from '../controllers/channel.controller';
import { protect } from '../middleware/auth.middleware';

const router = Router();

router.use(protect); // All channel routes protected

router.get('/:serverId', getChannels);
router.post('/', createChannel);

export default router;
