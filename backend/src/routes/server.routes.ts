import { Router } from 'express';
import { getServers, createServer, joinServer } from '../controllers/server.controller';
import { protect } from '../middleware/auth.middleware';

const router = Router();

router.use(protect); // All server routes protected

router.get('/', getServers);
router.post('/', createServer);
router.post('/:serverId/join', joinServer);

export default router;
