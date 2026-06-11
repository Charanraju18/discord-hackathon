import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from '../auth/AuthContext';
import { API_BASE_URL } from '../../config';

interface SocketContextType {
  socket: Socket | null;
  isConnected: boolean;
  onlineUsers: string[];
  presenceOverrides: Record<string, boolean>;
  // Unread DM tracking
  unreadDMs: Record<string, number>;
  markDMRead: (conversationId: string) => void;
  setActiveDMConversation: (id: string | null) => void;
}

const SocketContext = createContext<SocketContextType | undefined>(undefined);

export const SocketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState<string[]>([]);
  const [presenceOverrides, setPresenceOverrides] = useState<Record<string, boolean>>({});
  const [unreadDMs, setUnreadDMs] = useState<Record<string, number>>({});
  const activeDMConvRef = useRef<string | null>(null);

  const markDMRead = (conversationId: string) => {
    activeDMConvRef.current = conversationId;
    setUnreadDMs(prev => {
      if (!prev[conversationId]) return prev;
      const next = { ...prev };
      delete next[conversationId];
      return next;
    });
  };

  const setActiveDMConversation = (id: string | null) => {
    activeDMConvRef.current = id;
    if (id) {
      setUnreadDMs(prev => {
        if (!prev[id]) return prev;
        const next = { ...prev };
        delete next[id];
        return next;
      });
    }
  };

  useEffect(() => {
    if (!user) return;
    const token = localStorage.getItem('token');
    if (!token) return;

    const newSocket = io(`${API_BASE_URL}`, { auth: { token } });

    newSocket.on('connect', () => {
      setIsConnected(true);
      newSocket.emit('setup', user.id);
    });

    newSocket.on('presence', ({ userId, isOnline }: { userId: string; isOnline: boolean }) => {
      if (isOnline) {
        setOnlineUsers(prev => prev.includes(userId) ? prev : [...prev, userId]);
      } else {
        setOnlineUsers(prev => prev.filter(id => id !== userId));
      }
      setPresenceOverrides(prev => ({ ...prev, [userId]: isOnline }));
    });

    newSocket.on('online-users', (users: string[]) => {
      setOnlineUsers(users);
    });

    // Track unread DMs — increment only when the conversation isn't currently open
    newSocket.on('new_direct_message', (msg: any) => {
      const convId = msg.conversationId;
      const senderId = msg.sender?.id;
      // Don't count own messages or messages in the active conversation
      if (!convId || senderId === user.id) return;
      if (convId === activeDMConvRef.current) return;
      setUnreadDMs(prev => ({ ...prev, [convId]: (prev[convId] ?? 0) + 1 }));
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
    <SocketContext.Provider value={{
      socket, isConnected, onlineUsers, presenceOverrides,
      unreadDMs, markDMRead, setActiveDMConversation
    }}>
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
