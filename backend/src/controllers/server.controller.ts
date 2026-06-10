import { Request, Response } from 'express';
import { Server } from '../models/Server';
import { Channel } from '../models/Channel';

export const getServers = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user.id;
    const servers = await Server.find({ members: userId });
    
    res.json({ success: true, data: servers });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error fetching servers' });
  }
};

export const createServer = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name } = req.body;
    const userId = (req as any).user.id;

    if (!name) {
      res.status(400).json({ success: false, message: 'Server name is required' });
      return;
    }

    const server = await Server.create({
      name,
      ownerId: userId,
      members: [userId],
    });

    // Create a default "general" channel
    await Channel.create({
      name: 'general',
      serverId: server.id,
    });

    res.status(201).json({ success: true, data: server });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error creating server' });
  }
};

export const joinServer = async (req: Request, res: Response): Promise<void> => {
  try {
    const { serverId } = req.params;
    const userId = (req as any).user.id;

    const server = await Server.findById(serverId);
    if (!server) {
      res.status(404).json({ success: false, message: 'Server not found' });
      return;
    }

    if (!server.members.includes(userId)) {
      server.members.push(userId);
      await server.save();
    }

    res.json({ success: true, data: server });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error joining server' });
  }
};

export const getServerMembers = async (req: Request, res: Response): Promise<void> => {
  try {
    const { serverId } = req.params;
    const userId = (req as any).user.id;

    const server = await Server.findById(serverId).populate('members', 'username email');
    if (!server) {
      res.status(404).json({ success: false, message: 'Server not found' });
      return;
    }

    // Validate that the requester is a member of the server
    const isMember = server.members.some((member: any) => member.id === userId || member._id.toString() === userId);
    if (!isMember) {
      res.status(403).json({ success: false, message: 'Not authorized to view members' });
      return;
    }

    res.json({ success: true, data: { members: server.members, ownerId: server.ownerId } });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error fetching server members' });
  }
};
