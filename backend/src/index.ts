import express from 'express';
import cors from 'cors';
import http from 'http';
import { Server } from 'socket.io';
import dotenv from 'dotenv';
import { connectDB } from './config/db';
import authRoutes from './routes/auth.routes';
import serverRoutes from './routes/server.routes';
import channelRoutes from './routes/channel.routes';
import messageRoutes from './routes/message.routes';
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

// Socket.IO
io.on('connection', (socket) => {
  console.log(`User connected: ${socket.id}`);

  // When a user joins a channel
  socket.on('join-channel', ({ channelId }) => {
    socket.join(channelId);
    console.log(`User joined channel: ${channelId}`);
  });

  // When a user sends a message
  socket.on('send-message', async (data) => {
    try {
      const { channelId, content, senderId, username } = data;
      
      // Save message to DB
      const message = await Message.create({
        content,
        senderId,
        channelId,
      });

      // We need to populate the sender for the frontend
      const populatedMessage = await Message.findById(message._id).populate('senderId', 'username email');

      // Broadcast to channel
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

  // User online status (Basic MVP)
  socket.on('user-online', ({ userId }) => {
    socket.broadcast.emit('user-online', { userId });
  });

  socket.on('disconnect', () => {
    console.log(`User disconnected: ${socket.id}`);
    // Would handle offline status here if mapping socket.id to userId
  });
});

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
