import { Request, Response } from 'express';
import { ServerInvitation } from '../models/ServerInvitation';
import { Server } from '../models/Server';
import { User } from '../models/User';

export const inviteUser = async (req: Request, res: Response): Promise<void> => {
  try {
    const { serverId } = req.params;
    const { receiverId } = req.body;
    const senderId = (req as any).user.id;

    if (senderId === receiverId) {
      res.status(400).json({ success: false, message: 'Cannot invite yourself' });
      return;
    }

    const server = await Server.findById(serverId);
    if (!server) {
      res.status(404).json({ success: false, message: 'Server not found' });
      return;
    }

    const isSenderMember = server.members.some((m) => m.toString() === senderId);
    if (!isSenderMember) {
      res.status(403).json({ success: false, message: 'Only server members can invite others' });
      return;
    }

    const isReceiverMember = server.members.some((m) => m.toString() === receiverId);
    if (isReceiverMember) {
      res.status(400).json({ success: false, message: 'User is already a member of this server' });
      return;
    }

    // Check for existing pending invitation to prevent duplicates
    const existingInvite = await ServerInvitation.findOne({
      serverId,
      receiverId,
      status: 'pending',
      $or: [{ expiresAt: null }, { expiresAt: { $gt: new Date() } }]
    }).populate('serverId senderId receiverId');

    if (existingInvite) {
      res.status(200).json({ success: true, data: existingInvite });
      return;
    }

    // Create new invitation
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days expiration

    const invitation = await ServerInvitation.create({
      serverId,
      senderId,
      receiverId,
      status: 'pending',
      expiresAt
    } as any);

    const populatedInvitation = await ServerInvitation.findById(invitation._id)
      .populate('serverId', 'name')
      .populate('senderId', 'username');

    // Emit real-time notification
    const io = req.app.get('io');
    if (io) {
      io.to(receiverId).emit('notification-created', {
        type: 'server_invitation',
        data: populatedInvitation,
        createdAt: invitation.createdAt
      });
    }

    res.status(201).json({ success: true, data: populatedInvitation });
  } catch (error) {
    console.error('Invite User Error:', error);
    res.status(500).json({ success: false, message: 'Server error creating invitation' });
  }
};

export const getInvitations = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user.id;

    const invitations = await ServerInvitation.find({
      receiverId: userId,
      status: 'pending',
      $or: [{ expiresAt: null }, { expiresAt: { $gt: new Date() } }]
    })
      .populate('serverId', 'name')
      .populate('senderId', 'username')
      .sort({ createdAt: -1 });

    res.status(200).json({ success: true, data: invitations });
  } catch (error) {
    console.error('Get Invitations Error:', error);
    res.status(500).json({ success: false, message: 'Server error fetching invitations' });
  }
};

export const acceptInvitation = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = (req as any).user.id;

    const invitation = await ServerInvitation.findOne({ _id: id, receiverId: userId });
    
    if (!invitation) {
      res.status(404).json({ success: false, message: 'Invitation not found' });
      return;
    }

    if (invitation.status !== 'pending') {
      res.status(400).json({ success: false, message: `Invitation already ${invitation.status}` });
      return;
    }

    if (invitation.expiresAt && invitation.expiresAt < new Date()) {
      res.status(410).json({ success: false, message: 'Invitation has expired' });
      return;
    }

    const server = await Server.findById(invitation.serverId);
    if (!server) {
      res.status(404).json({ success: false, message: 'Server no longer exists' });
      return;
    }

    invitation.status = 'accepted';
    await invitation.save();

    // Idempotency: Check if already a member
    const isMember = server.members.some((m) => m.toString() === userId);
    if (!isMember) {
      server.members.push(userId);
      await server.save();
    }

    // Emit event back to sender (optional UX boost)
    const io = req.app.get('io');
    if (io) {
      io.to(invitation.senderId.toString()).emit('invitation-accepted', {
        receiverId: userId,
        serverId: server._id
      });
    }

    res.status(200).json({ success: true, data: server });
  } catch (error) {
    console.error('Accept Invitation Error:', error);
    res.status(500).json({ success: false, message: 'Server error accepting invitation' });
  }
};

export const declineInvitation = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = (req as any).user.id;

    const invitation = await ServerInvitation.findOne({ _id: id, receiverId: userId });
    
    if (!invitation) {
      res.status(404).json({ success: false, message: 'Invitation not found' });
      return;
    }

    if (invitation.status !== 'pending') {
      res.status(400).json({ success: false, message: `Invitation already ${invitation.status}` });
      return;
    }

    invitation.status = 'declined';
    await invitation.save();

    const io = req.app.get('io');
    if (io) {
      io.to(invitation.senderId.toString()).emit('invitation-declined', {
        receiverId: userId,
        serverId: invitation.serverId
      });
    }

    res.status(200).json({ success: true, message: 'Invitation declined' });
  } catch (error) {
    console.error('Decline Invitation Error:', error);
    res.status(500).json({ success: false, message: 'Server error declining invitation' });
  }
};
