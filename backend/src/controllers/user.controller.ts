import { Request, Response } from 'express';
import { User } from '../models/User';

export const searchUsers = async (req: Request, res: Response): Promise<void> => {
  try {
    const { q = '', limit = '10' } = req.query;
    const currentUserId = (req as any).user.id;
    
    if (!q || typeof q !== 'string' || q.trim() === '') {
       res.status(200).json({ success: true, data: [] });
       return;
    }

    // Escape regex characters for safe search
    const safeQuery = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

    const users = await User.find({
      _id: { $ne: currentUserId }, // Exclude self
      username: { $regex: safeQuery, $options: 'i' }
    })
    .select('_id username')
    .limit(parseInt(limit as string))
    .lean();

    res.status(200).json({ success: true, data: users });
  } catch (error) {
    console.error('Search Users Error:', error);
    res.status(500).json({ success: false, message: 'Server error searching users' });
  }
};
