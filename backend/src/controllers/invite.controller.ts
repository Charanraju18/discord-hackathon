import { Request, Response } from 'express';
import crypto from 'crypto';
import { Invite } from '../models/Invite';
import { Server } from '../models/Server';
import { Channel } from '../models/Channel';

// Helper to generate an 8-character secure code
const generateInviteCode = (): string => {
  return crypto.randomBytes(4).toString('hex');
};

export const createInvite = async (req: Request, res: Response): Promise<void> => {
  try {
    const { serverId } = req.params;
    const userId = (req as any).user.id;

    // 1. Validate server exists and user is a member
    const server = await Server.findById(serverId);
    if (!server) {
      res.status(404).json({ success: false, message: 'Server not found' });
      return;
    }

    const isMember = server.members.some((m) => m.toString() === userId);
    if (!isMember) {
      res.status(403).json({ success: false, message: 'You must be a member to create an invite' });
      return;
    }

    // Optional: Owner/Admin check could go here
    // if (server.ownerId.toString() !== userId) return 403;

    // 2. Check for existing valid invite from this user to prevent DB bloat
    const existingInvite = await Invite.findOne({
      serverId,
      createdBy: userId,
      $or: [{ expiresAt: null }, { expiresAt: { $gt: new Date() } }],
    });

    if (existingInvite) {
      res.status(200).json({ success: true, data: existingInvite });
      return;
    }

    // 3. Generate new unique code with collision retry logic
    let code = '';
    let inviteCreated = false;
    let attempts = 0;

    while (!inviteCreated && attempts < 5) {
      code = generateInviteCode();
      const collision = await Invite.findOne({ code });
      if (!collision) {
        inviteCreated = true;
      }
      attempts++;
    }

    if (!inviteCreated) {
      res.status(500).json({ success: false, message: 'Failed to generate unique invite code' });
      return;
    }

    // Set expiration to 7 days from now (or keep null for never expires)
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    const newInvite = await Invite.create({
      code,
      serverId,
      createdBy: userId,
      expiresAt,
    });

    res.status(201).json({ success: true, data: newInvite });
  } catch (error) {
    console.error('Create Invite Error:', error);
    res.status(500).json({ success: false, message: 'Server error creating invite' });
  }
};

export const getInvite = async (req: Request, res: Response): Promise<void> => {
  try {
    const { code } = req.params;

    const invite = await Invite.findOne({ code })
      .populate('serverId', 'name members')
      .populate('createdBy', 'username');

    if (!invite) {
      res.status(404).json({ success: false, message: 'Invite not found or invalid' });
      return;
    }

    if (invite.expiresAt && invite.expiresAt < new Date()) {
      res.status(410).json({ success: false, message: 'Invite has expired' });
      return;
    }

    // Format response to include member count
    const server: any = invite.serverId;
    
    res.status(200).json({
      success: true,
      data: {
        code: invite.code,
        server: {
          _id: server._id,
          name: server.name,
          memberCount: server.members ? server.members.length : 0,
        },
        inviter: (invite.createdBy as any)?.username,
        expiresAt: invite.expiresAt,
      },
    });
  } catch (error) {
    console.error('Get Invite Error:', error);
    res.status(500).json({ success: false, message: 'Server error fetching invite' });
  }
};

export const joinInvite = async (req: Request, res: Response): Promise<void> => {
  try {
    const { code } = req.params;
    const userId = (req as any).user.id;

    const invite = await Invite.findOne({ code });
    if (!invite) {
      res.status(404).json({ success: false, message: 'Invite not found or invalid' });
      return;
    }

    if (invite.expiresAt && invite.expiresAt < new Date()) {
      res.status(410).json({ success: false, message: 'Invite has expired' });
      return;
    }

    const server = await Server.findById(invite.serverId);
    if (!server) {
      res.status(404).json({ success: false, message: 'Server no longer exists' });
      return;
    }

    // Idempotent join: Check if user is already a member
    const isAlreadyMember = server.members.some((m) => m.toString() === userId);
    if (isAlreadyMember) {
      res.status(200).json({ success: true, message: 'Already a member', data: server });
      return;
    }

    // Add user to server
    server.members.push(userId);
    await server.save();

    res.status(200).json({ success: true, message: 'Joined server successfully', data: server });
  } catch (error) {
    console.error('Join Invite Error:', error);
    res.status(500).json({ success: false, message: 'Server error joining via invite' });
  }
};
