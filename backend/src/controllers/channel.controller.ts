import { Request, Response } from 'express';
import { Channel } from '../models/Channel';
import { Server } from '../models/Server';

export const getChannels = async (req: Request, res: Response): Promise<void> => {
  try {
    const { serverId } = req.params;
    const channels = await Channel.find({ serverId });
    
    res.json({ success: true, data: channels });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error fetching channels' });
  }
};

export const createChannel = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, serverId } = req.body;
    const userId = (req as any).user.id;

    if (!name || !serverId) {
      res.status(400).json({ success: false, message: 'Channel name and serverId are required' });
      return;
    }

    // Verify user is member of server
    const server = await Server.findById(serverId);
    if (!server || !server.members.includes(userId)) {
      res.status(403).json({ success: false, message: 'Not authorized to create channel in this server' });
      return;
    }

    const channel = await Channel.create({
      name,
      serverId,
    });

    res.status(201).json({ success: true, data: channel });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error creating channel' });
  }
};
