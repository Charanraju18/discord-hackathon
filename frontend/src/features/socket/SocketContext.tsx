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

    const newSocket = io(`${API_BASE_URL}`, {
      auth: {
        token
      }
    });

    newSocket.on('connect', () => {
      setIsConnected(true);
    });

    newSocket.on('online-users', (users: string[]) => {
      setOnlineUsers(users); // Keep legacy full sync just in case
    });

    newSocket.on('user:online', ({ userId }: { userId: string }) => {
      setOnlineUsers(prev => {
        if (!prev.includes(userId)) {
          return [...prev, userId];
        }
        return prev;
      });
      setPresenceOverrides(prev => ({ ...prev, [userId]: true }));
    });

    newSocket.on('user:offline', ({ userId }: { userId: string }) => {
      setOnlineUsers(prev => prev.filter(id => id !== userId));
      setPresenceOverrides(prev => ({ ...prev, [userId]: false }));
    });

    newSocket.on('disconnect', () => {
      setIsConnected(false);
      setOnlineUsers([]);
      setPresenceOverrides({});
    });

    setSocket(newSocket);

    return () => {
      newSocket.close();
    };
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
