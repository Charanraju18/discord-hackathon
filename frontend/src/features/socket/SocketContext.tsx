import React, { createContext, useContext, useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from '../auth/AuthContext';
import { API_BASE_URL } from '../../config';

interface SocketContextType {
  socket: Socket | null;
  isConnected: boolean;
  onlineUsers: string[];
  presenceOverrides: Record<string, boolean>;
}

const SocketContext = createContext<SocketContextType | undefined>(undefined);

export const SocketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState<string[]>([]);
  const [presenceOverrides, setPresenceOverrides] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (!user) return;
    const token = localStorage.getItem('token');
    if (!token) return;

    const newSocket = io(`${API_BASE_URL}`, { auth: { token } });

    newSocket.on('connect', () => {
      setIsConnected(true);
      // Register this socket session with the backend so it can map sid → userId
      newSocket.emit('setup', user.id);
    });

    // Backend emits `presence` with { userId, isOnline }
    newSocket.on('presence', ({ userId, isOnline }: { userId: string; isOnline: boolean }) => {
      if (isOnline) {
        setOnlineUsers(prev => prev.includes(userId) ? prev : [...prev, userId]);
      } else {
        setOnlineUsers(prev => prev.filter(id => id !== userId));
      }
      setPresenceOverrides(prev => ({ ...prev, [userId]: isOnline }));
    });

    // Legacy full sync (kept for compatibility)
    newSocket.on('online-users', (users: string[]) => {
      setOnlineUsers(users);
    });

    newSocket.on('disconnect', () => {
      setIsConnected(false);
      setOnlineUsers([]);
      setPresenceOverrides({});
    });

    setSocket(newSocket);
    return () => { newSocket.close(); };
  }, [user]);

  return (
    <SocketContext.Provider value={{ socket, isConnected, onlineUsers, presenceOverrides }}>
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (context === undefined) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
};
