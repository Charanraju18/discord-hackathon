import { Request, Response } from 'express';
import { DirectConversation } from '../models/DirectConversation';
import { DirectMessage } from '../models/DirectMessage';
import { Friendship } from '../models/Friendship';
import { User } from '../models/User';
import mongoose from 'mongoose';

const getSortedUserIds = (userId1: string, userId2: string) => {
  return userId1 < userId2 ? [userId1, userId2] : [userId2, userId1];
};

export const startConversation = async (req: Request, res: Response): Promise<void> => {
  try {
    const { friendId } = req.body;
    const userId = (req as any).user.id;

    if (userId === friendId) {
      res.status(400).json({ success: false, message: 'Cannot start conversation with yourself' });
      return;
    }

    // Verify friendship exists
    const [userOneId, userTwoId] = getSortedUserIds(userId, friendId);
    const friendship = await Friendship.findOne({ userOneId, userTwoId });
    if (!friendship) {
      res.status(403).json({ success: false, message: 'You can only message friends' });
      return;
    }

    // Find existing conversation
    let conversation = await DirectConversation.findOne({ participants: { $all: [userId, friendId] } }).populate('participants', 'username status avatar');
    
    if (!conversation) {
      // Create new conversation
      conversation = await DirectConversation.create({
        participants: [userId, friendId],
        readStates: new Map()
      });
      conversation = await conversation.populate('participants', 'username status avatar');
    }

    res.status(200).json({ success: true, data: conversation });
  } catch (error) {
    console.error('Start Conversation Error:', error);
    res.status(500).json({ success: false, message: 'Server error starting conversation' });
  }
};

export const getConversations = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user.id;

    const conversations = await DirectConversation.find({ participants: userId })
      .populate('participants', 'username email status avatar')
      .populate('lastMessageId')
      .sort({ updatedAt: -1 });

    const formattedConversations = conversations.map(conv => {
      const friend = conv.participants.find(p => p._id.toString() !== userId);
      const lastReadAt = conv.readStates?.get(userId);
      const lastMessageAt = (conv.lastMessageId as any)?.createdAt;

      // Simplistic unread calculation: if there's a last message and its createdAt is after our lastReadAt
      const isUnread = lastMessageAt && (!lastReadAt || new Date(lastMessageAt) > new Date(lastReadAt));

      return {
        _id: conv._id,
        friend,
        lastMessage: conv.lastMessageId,
        unread: isUnread,
        updatedAt: conv.updatedAt
      };
    });

    res.status(200).json({ success: true, data: formattedConversations });
  } catch (error) {
    console.error('Get Conversations Error:', error);
    res.status(500).json({ success: false, message: 'Server error fetching conversations' });
  }
};

export const getMessages = async (req: Request, res: Response): Promise<void> => {
  try {
    const { conversationId } = req.params;
    const { page = 1, limit = 50 } = req.query;
    const userId = (req as any).user.id;

    const conversation = await DirectConversation.findOne({ _id: conversationId, participants: userId });
    if (!conversation) {
      res.status(404).json({ success: false, message: 'Conversation not found or access denied' });
      return;
    }

    const messages = await DirectMessage.find({ 
      conversationId,
      deleted: { $ne: true } 
    })
      .populate('senderId', 'username email')
      .sort({ createdAt: -1 })
      .skip((Number(page) - 1) * Number(limit))
      .limit(Number(limit));

    // Update read state
    conversation.readStates.set(userId, new Date());
    await conversation.save();

    res.status(200).json({ success: true, data: messages.reverse() });
  } catch (error) {
    console.error('Get Messages Error:', error);
    res.status(500).json({ success: false, message: 'Server error fetching messages' });
  }
};

export const sendMessage = async (req: Request, res: Response): Promise<void> => {
  try {
    const { conversationId } = req.params;
    const { content, attachments = [] } = req.body;
    const userId = (req as any).user.id;

    if ((!content || !content.trim()) && attachments.length === 0) {
      res.status(400).json({ success: false, message: 'Message content or attachments are required' });
      return;
    }

    const conversation = await DirectConversation.findOne({ _id: conversationId, participants: userId });
    if (!conversation) {
      res.status(404).json({ success: false, message: 'Conversation not found' });
      return;
    }

    const [message] = await DirectMessage.create([{
      conversationId: conversationId as string,
      senderId: userId,
      content: content ? content.trim() : undefined,
      attachments
    }]);

    conversation.lastMessageId = message._id as mongoose.Types.ObjectId;
    conversation.readStates.set(userId, new Date()); // Mark sender as read
    await conversation.save();

    const populatedMessage = await DirectMessage.findById(message._id).populate('senderId', 'username email');

    // Emit via socket
    const io = req.app.get('io');
    if (io) {
      const room = `dm:${conversationId}`;
      io.to(room).emit('dm:new-message', populatedMessage);
      
      // Also notify friend via their user room if they aren't in the DM room actively
      const friendId = conversation.participants.find(p => p.toString() !== userId)?.toString();
      if (friendId) {
        io.to(friendId).emit('notification-created', {
          type: 'direct_message',
          data: {
            conversationId,
            senderId: userId,
            message: content.substring(0, 50)
          },
          createdAt: new Date()
        });
      }
    }

    res.status(201).json({ success: true, data: populatedMessage });
  } catch (error) {
    console.error('Send Message Error:', error);
    res.status(500).json({ success: false, message: 'Server error sending message' });
  }
};

export const editMessage = async (req: Request, res: Response): Promise<void> => {
  try {
    const { messageId } = req.params;
    const { content } = req.body;
    const userId = (req as any).user.id;

    const message = await DirectMessage.findById(messageId);
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
      res.status(400).json({ success: false, message: 'Cannot edit deleted message' });
      return;
    }

    message.content = content.trim();
    message.isEdited = true;
    message.editedAt = new Date();
    await message.save();

    const populatedMessage = await DirectMessage.findById(message._id).populate('senderId', 'username email');

    const io = req.app.get('io');
    if (io) {
      io.to(`dm:${message.conversationId}`).emit('dm:message-updated', populatedMessage);
    }

    res.status(200).json({ success: true, data: populatedMessage });
  } catch (error) {
    console.error('Edit Message Error:', error);
    res.status(500).json({ success: false, message: 'Server error editing message' });
  }
};

export const deleteMessage = async (req: Request, res: Response): Promise<void> => {
  try {
    const { messageId } = req.params;
    const userId = (req as any).user.id;

    const message = await DirectMessage.findById(messageId);
    if (!message) {
      res.status(404).json({ success: false, message: 'Message not found' });
      return;
    }

    if (message.senderId.toString() !== userId) {
      res.status(403).json({ success: false, message: 'You can only delete your own messages' });
      return;
    }

    message.deleted = true;
    message.deletedAt = new Date();
    await message.save();

    const io = req.app.get('io');
    if (io) {
      io.to(`dm:${message.conversationId}`).emit('dm:message-deleted', messageId);
    }

    res.status(200).json({ success: true, message: 'Message deleted' });
  } catch (error) {
    console.error('Delete Message Error:', error);
    res.status(500).json({ success: false, message: 'Server error deleting message' });
  }
};
