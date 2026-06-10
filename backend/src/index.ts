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
import { Message } from './models/Message';

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

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/servers', serverRoutes);
app.use('/api/channels', channelRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/invites', inviteRoutes);

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
io.on('connection', (socket) => {
  const userId = (socket as any).userId;
  console.log(`User connected: ${userId} on socket ${socket.id}`);

  // Register Presence
  if (!userSockets.has(userId)) {
    userSockets.set(userId, new Set());
  }
  userSockets.get(userId)!.add(socket.id);
  socketUser.set(socket.id, userId);

  // Broadcast updated presence
  broadcastOnlineUsers();

  // When a user joins a channel
  socket.on('join-channel', ({ channelId }) => {
    socket.join(channelId);
  });

  // When a user sends a message
  socket.on('send-message', async (data) => {
    try {
      const { channelId, content, senderId, username } = data;
      
      const message = await Message.create({
        content,
        senderId,
        channelId,
      });

      const populatedMessage = await Message.findById(message._id).populate('senderId', 'username email');

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

  socket.on('disconnect', () => {
    console.log(`User disconnected: socket ${socket.id}`);
    
    const uid = socketUser.get(socket.id);
    if (uid) {
      const sockets = userSockets.get(uid);
      if (sockets) {
        sockets.delete(socket.id);
        if (sockets.size === 0) {
          userSockets.delete(uid);
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
