import { Request, Response } from 'express';
import { Message } from '../models/Message';
import { Channel } from '../models/Channel';

export const getMessages = async (req: Request, res: Response): Promise<void> => {
  try {
    const { channelId } = req.params;
    
    // Check if channel exists
    const channel = await Channel.findById(channelId);
    if (!channel) {
      res.status(404).json({ success: false, message: 'Channel not found' });
      return;
    }

    const messages = await Message.find({ channelId })
      .populate('senderId', 'username email')
      .sort({ createdAt: 1 });
    
    res.json({ success: true, data: messages });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error fetching messages' });
  }
};
