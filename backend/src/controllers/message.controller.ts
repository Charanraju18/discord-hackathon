import { Request, Response } from 'express';
import { Message } from '../models/Message';
import { Channel } from '../models/Channel';

export const getMessages = async (req: Request, res: Response): Promise<void> => {
  try {
    const { channelId } = req.params;
    
    const channel = await Channel.findById(channelId);
    if (!channel) {
      res.status(404).json({ success: false, message: 'Channel not found' });
      return;
    }

    const messages = await Message.find({ channelId, deleted: { $ne: true } })
      .populate('senderId', 'username email')
      .sort({ createdAt: 1 })
      .lean();

    res.json({ success: true, data: messages });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error fetching messages' });
  }
};

export const editMessage = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { content } = req.body;
    const userId = (req as any).user.id;

    const message = await Message.findById(id);
    if (!message) {
      res.status(404).json({ success: false, message: 'Message not found' });
      return;
    }

    if ((!content || content.trim().length === 0) && message.attachments.length === 0) {
      res.status(400).json({ success: false, message: 'Message content cannot be empty' });
      return;
    }

    if (message.senderId.toString() !== userId) {
      res.status(403).json({ success: false, message: 'You can only edit your own messages' });
      return;
    }

    if (message.deleted) {
      res.status(400).json({ success: false, message: 'Cannot edit a deleted message' });
      return;
    }

    message.content = content.trim();
    message.isEdited = true;
    message.editedAt = new Date();
    await message.save();

    const populatedMessage = await Message.findById(message._id).populate('senderId', 'username email');

    const io = req.app.get('io');
    if (io) {
      io.to(message.channelId.toString()).emit('message-updated', populatedMessage);
    }

    res.json({ success: true, data: populatedMessage });
  } catch (error) {
    console.error('Edit Message Error:', error);
    res.status(500).json({ success: false, message: 'Server error editing message' });
  }
};

export const deleteMessage = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = (req as any).user.id;

    const message = await Message.findById(id);
    if (!message) {
      res.status(404).json({ success: false, message: 'Message not found' });
      return;
    }

    if (message.senderId.toString() !== userId) {
      res.status(403).json({ success: false, message: 'You can only delete your own messages' });
      return;
    }

    if (message.deleted) {
      res.status(400).json({ success: false, message: 'Message is already deleted' });
      return;
    }

    // Soft delete logic: preserve original content in DB
    message.deleted = true;
    message.deletedAt = new Date();
    await message.save();

    const populatedMessage = await Message.findById(message._id)
      .populate('senderId', 'username email')
      .lean();

    // Scrub content for the socket payload
    if (populatedMessage) {
      populatedMessage.content = 'Message deleted';
    }

    const io = req.app.get('io');
    if (io) {
      io.to(message.channelId.toString()).emit('message-deleted', populatedMessage);
    }

    res.json({ success: true, data: populatedMessage });
  } catch (error) {
    console.error('Delete Message Error:', error);
    res.status(500).json({ success: false, message: 'Server error deleting message' });
  }
};
