import express from 'express';
import cors from 'cors';
import http from 'http';
import { Server } from 'socket.io';
import dotenv from 'dotenv';
import jwt from 'jsonwebtoken';
import { connectDB } from './config/db';
import authRoutes from './routes/auth.routes';
import serverRoutes from './routes/server.routes';
import channelRoutes from './routes/channel.routes';
import messageRoutes from './routes/message.routes';
import inviteRoutes from './routes/invite.routes';
import userRoutes from './routes/user.routes';
import serverInvitationRoutes from './routes/serverInvitation.routes';
import friendRoutes from './routes/friend.routes';
import directMessageRoutes from './routes/directMessage.routes';
import uploadRoutes from './routes/upload.routes';
import { Message } from './models/Message';
import { User } from './models/User';
import { Friendship } from './models/Friendship';

dotenv.config();

// Connect to database
connectDB();

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*', // For hackathon MVP
    methods: ['GET', 'POST'],
  },
});

app.set('io', io);

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/servers', serverRoutes);
app.use('/api/channels', channelRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/invites', inviteRoutes);
app.use('/api/users', userRoutes);
app.use('/api/server-invitations', serverInvitationRoutes);
app.use('/api/friends', friendRoutes);
app.use('/api/dms', directMessageRoutes);
app.use('/api/uploads', uploadRoutes);

// Presence Registries
const userSockets = new Map<string, Set<string>>(); // userId -> Set of socketIds
const socketUser = new Map<string, string>(); // socketId -> userId

const broadcastOnlineUsers = () => {
  const onlineUsers = Array.from(userSockets.keys());
  io.emit('online-users', onlineUsers);
};

// Socket.IO Middleware for Authentication
io.use((socket, next) => {
  const token = socket.handshake.auth.token;
  if (!token) {
    return next(new Error('Authentication error: No token provided'));
  }
  
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret') as any;
    (socket as any).userId = decoded.id;
    next();
  } catch (err) {
    return next(new Error('Authentication error: Invalid token'));
  }
});

// Socket.IO Events
io.on('connection', async (socket) => {
  const userId = (socket as any).userId;
  console.log(`User connected: ${userId} on socket ${socket.id}`);

  // Register Presence
  socket.join(userId); // Legacy, keep if used elsewhere
  socket.join(`user:${userId}`); // Specific user room
  
  if (!userSockets.has(userId)) {
    userSockets.set(userId, new Set());
  }
  const isFirstConnection = userSockets.get(userId)!.size === 0;
  userSockets.get(userId)!.add(socket.id);
  socketUser.set(socket.id, userId);

  if (isFirstConnection) {
    try {
      await User.findByIdAndUpdate(userId, { isOnline: true });
      const friendships = await Friendship.find({
        $or: [{ userOneId: userId }, { userTwoId: userId }]
      });
      friendships.forEach(f => {
        const friendId = f.userOneId.toString() === userId ? f.userTwoId.toString() : f.userOneId.toString();
        io.to(`user:${friendId}`).emit('user:online', { userId });
      });
    } catch (err) {
      console.error('Error handling first connection presence:', err);
    }
  }

  // Broadcast updated presence globally (legacy)
  broadcastOnlineUsers();

  // When a user joins a channel
  socket.on('join-channel', ({ channelId }) => {
    socket.join(channelId);
  });

  // When a user sends a message
  socket.on('send-message', async (data) => {
    try {
      const { channelId, content, attachments = [], senderId, username } = data;
      
      const message = await Message.create({
        content,
        attachments,
        senderId,
        channelId,
      });

      const populatedMessage = await Message.findById(message._id).populate('senderId', 'username email isOnline avatar');

      io.to(channelId).emit('receive-message', populatedMessage);
    } catch (err) {
      console.error('Error saving message:', err);
    }
  });

  // Typing indicators
  socket.on('typing', ({ channelId, username }) => {
    socket.to(channelId).emit('user-typing', { channelId, username });
  });

  socket.on('stop-typing', ({ channelId, username }) => {
    socket.to(channelId).emit('user-stop-typing', { channelId, username });
  });

  // --- DM Events ---
  socket.on('dm:join-conversation', ({ conversationId }) => {
    socket.join(`dm:${conversationId}`);
  });

  socket.on('dm:typing', ({ conversationId, username }) => {
    socket.to(`dm:${conversationId}`).emit('dm:typing', { conversationId, username });
  });

  socket.on('dm:stop-typing', ({ conversationId, username }) => {
    socket.to(`dm:${conversationId}`).emit('dm:stop-typing', { conversationId, username });
  });

  socket.on('disconnect', async () => {
    console.log(`User disconnected: socket ${socket.id}`);
    
    const uid = socketUser.get(socket.id);
    if (uid) {
      const sockets = userSockets.get(uid);
      if (sockets) {
        sockets.delete(socket.id);
        if (sockets.size === 0) {
          userSockets.delete(uid);
          
          try {
            await User.findByIdAndUpdate(uid, { isOnline: false, lastSeen: new Date() });
            const friendships = await Friendship.find({
              $or: [{ userOneId: uid }, { userTwoId: uid }]
            });
            friendships.forEach(f => {
              const friendId = f.userOneId.toString() === uid ? f.userTwoId.toString() : f.userOneId.toString();
              io.to(`user:${friendId}`).emit('user:offline', { userId: uid });
            });
          } catch (err) {
            console.error('Error handling last disconnect presence:', err);
          }
        }
      }
      socketUser.delete(socket.id);
      
      // Broadcast updated presence
      broadcastOnlineUsers();
    }
  });
});

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
