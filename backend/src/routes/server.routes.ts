import { Router } from 'express';
import { getServers, createServer, joinServer, getServerMembers } from '../controllers/server.controller';
import { createInvite } from '../controllers/invite.controller';
import { inviteUser } from '../controllers/serverInvitation.controller';
import { protect } from '../middleware/auth.middleware';

const router = Router();

router.use(protect); // All server routes protected

router.get('/', getServers);
router.post('/', createServer);
router.post('/:serverId/join', joinServer);
router.get('/:serverId/members', getServerMembers);
router.post('/:serverId/invites', createInvite);
router.post('/:serverId/invite-user', inviteUser);

export default router;
