import { Request, Response } from 'express';
import { User } from '../models/User';
import { Friendship } from '../models/Friendship';
import { FriendRequest } from '../models/FriendRequest';

export const searchUsers = async (req: Request, res: Response): Promise<void> => {
  try {
    const { query = '', page = '1', limit = '20' } = req.query;
    // support legacy 'q' or new 'query'
    const q = req.query.q || query;
    const currentUserId = (req as any).user.id;
    
    if (!q || typeof q !== 'string' || q.trim() === '') {
       res.status(200).json({ success: true, data: [] });
       return;
    }

    const safeQuery = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const pageNum = Math.max(1, parseInt(page as string) || 1);
    const limitNum = Math.min(50, Math.max(1, parseInt(limit as string) || 20));
    const skip = (pageNum - 1) * limitNum;

    // Fetch existing friendships
    const friendships = await Friendship.find({
      $or: [{ userOneId: currentUserId }, { userTwoId: currentUserId }]
    }).lean();
    
    const friendIds = friendships.map(f => 
      f.userOneId.toString() === currentUserId ? f.userTwoId.toString() : f.userOneId.toString()
    );

    // Fetch pending requests
    const requests = await FriendRequest.find({
      $or: [{ senderId: currentUserId }, { receiverId: currentUserId }]
    }).lean();
    
    const requestIds = requests.map(r => 
      r.senderId.toString() === currentUserId ? r.receiverId.toString() : r.senderId.toString()
    );

    const excludeIds = [currentUserId, ...friendIds, ...requestIds];

    const users = await User.find({
      _id: { $nin: excludeIds },
      username: { $regex: safeQuery, $options: 'i' }
    })
    .select('_id username isOnline avatar')
    .skip(skip)
    .limit(limitNum)
    .lean();

    res.status(200).json({ success: true, data: users, page: pageNum, limit: limitNum });
  } catch (error) {
    console.error('Search Users Error:', error);
    res.status(500).json({ success: false, message: 'Server error searching users' });
  }
};
