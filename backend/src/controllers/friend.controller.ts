import { Request, Response } from 'express';
import { FriendRequest } from '../models/FriendRequest';
import { Friendship } from '../models/Friendship';
import { Notification } from '../models/Notification';
import { User } from '../models/User';
import mongoose from 'mongoose';

const getSortedUserIds = (userId1: string, userId2: string) => {
  return userId1 < userId2 ? [userId1, userId2] : [userId2, userId1];
};

export const sendRequest = async (req: Request, res: Response): Promise<void> => {
  try {
    const { receiverId } = req.body;
    const senderId = (req as any).user.id;

    if (senderId === receiverId) {
      res.status(400).json({ success: false, message: 'Cannot send request to yourself' });
      return;
    }

    const receiver = await User.findById(receiverId);
    if (!receiver) {
      res.status(404).json({ success: false, message: 'User not found' });
      return;
    }

    const [userOneId, userTwoId] = getSortedUserIds(senderId, receiverId);
    
    // Check if friendship already exists
    const existingFriendship = await Friendship.findOne({ userOneId, userTwoId });
    if (existingFriendship) {
      res.status(400).json({ success: false, message: 'You are already friends' });
      return;
    }

    // Check if request already exists (either direction)
    const existingRequest = await FriendRequest.findOne({
      $or: [
        { senderId, receiverId },
        { senderId: receiverId, receiverId: senderId }
      ]
    });

    if (existingRequest) {
      res.status(400).json({ success: false, message: 'A pending request already exists between you and this user', data: existingRequest });
      return;
    }

    const request = await FriendRequest.create({ senderId, receiverId });
    const populatedRequest = await FriendRequest.findById(request._id).populate('senderId', 'username email').populate('receiverId', 'username email');

    // Create Notification for receiver
    const notification = await Notification.create({
      userId: receiverId,
      type: 'friend_request',
      data: populatedRequest
    });

    const io = req.app.get('io');
    if (io) {
      io.to(receiverId.toString()).emit('notification-created', {
        type: 'friend_request',
        data: populatedRequest,
        createdAt: request.createdAt
      });
    }

    res.json({ success: true, data: populatedRequest });
  } catch (error: any) {
    if (error.code === 11000) {
      res.status(400).json({ success: false, message: 'Request already exists' });
      return;
    }
    console.error(error);
    res.status(500).json({ success: false, message: 'Server error sending request' });
  }
};

export const getRequests = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user.id;

    const incoming = await FriendRequest.find({ receiverId: userId }).populate('senderId', 'username email');
    const outgoing = await FriendRequest.find({ senderId: userId }).populate('receiverId', 'username email');

    res.json({
      success: true,
      data: {
        incoming,
        outgoing,
        incomingCount: incoming.length,
        outgoingCount: outgoing.length
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error fetching requests' });
  }
};

export const acceptRequest = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = (req as any).user.id;

    const request = await FriendRequest.findById(id);
    if (!request) {
      res.status(404).json({ success: false, message: 'Request not found' });
      return;
    }

    if (request.receiverId.toString() !== userId) {
      res.status(403).json({ success: false, message: 'Unauthorized' });
      return;
    }

    const [userOneId, userTwoId] = getSortedUserIds(request.senderId.toString(), request.receiverId.toString());

    // Create friendship
    try {
      await Friendship.create({ userOneId, userTwoId });
    } catch (err: any) {
      if (err.code !== 11000) throw err; // ignore duplicate
    }

    // Delete request
    await FriendRequest.findByIdAndDelete(id);

    // Notify original sender
    const sender = await User.findById(userId); // the one who accepted
    const notification = await Notification.create({
      userId: request.senderId,
      type: 'friend_request_accepted',
      data: {
        userId: sender?._id,
        username: sender?.username
      }
    });

    const io = req.app.get('io');
    if (io) {
      io.to(request.senderId.toString()).emit('notification-created', {
        type: 'friend_request_accepted',
        data: {
          userId: sender?._id,
          username: sender?.username
        },
        createdAt: new Date()
      });
    }

    res.json({ success: true, message: 'Request accepted' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error accepting request' });
  }
};

export const rejectRequest = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = (req as any).user.id;

    const request = await FriendRequest.findById(id);
    if (!request) {
      res.status(404).json({ success: false, message: 'Request not found' });
      return;
    }

    if (request.receiverId.toString() !== userId && request.senderId.toString() !== userId) {
      res.status(403).json({ success: false, message: 'Unauthorized' });
      return;
    }

    await FriendRequest.findByIdAndDelete(id);

    res.json({ success: true, message: 'Request deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error rejecting request' });
  }
};

export const getFriends = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user.id;

    const friendships = await Friendship.find({
      $or: [{ userOneId: userId }, { userTwoId: userId }]
    }).populate('userOneId', 'username email').populate('userTwoId', 'username email');

    const friends = friendships.map(f => {
      const friend: any = f.userOneId._id.toString() === userId ? f.userTwoId : f.userOneId;
      return {
        _id: friend._id,
        username: friend.username,
        email: friend.email,
        status: 'offline', // Future presence placeholder
        friendshipId: f._id
      };
    });

    res.json({
      success: true,
      data: friends,
      count: friends.length
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error fetching friends' });
  }
};

export const removeFriend = async (req: Request, res: Response): Promise<void> => {
  try {
    const { friendId } = req.params;
    const userId = (req as any).user.id;

    const [userOneId, userTwoId] = getSortedUserIds(userId, friendId as string);

    const friendship = await Friendship.findOneAndDelete({ userOneId, userTwoId });
    if (!friendship) {
      res.status(404).json({ success: false, message: 'Friendship not found' });
      return;
    }

    res.json({ success: true, message: 'Friend removed' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error removing friend' });
  }
};
