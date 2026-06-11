import React, { createContext, useContext, useEffect, useRef, useState, useMemo, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from '../auth/AuthContext';
import { API_BASE_URL } from '../../config';

interface SocketContextType {
  socket: Socket | null;
  isConnected: boolean;
  onlineUsers: string[];
  presenceOverrides: Record<string, boolean>;

  // DM unreads — red badge on DM avatar
  unreadDMs: Record<string, number>;
  markDMRead: (conversationId: string) => void;
  setActiveDMConversation: (id: string | null) => void;

  // Channel unreads — bold channel name + dot
  unreadChannels: Record<string, number>;
  markChannelRead: (channelId: string) => void;
  setActiveChannelId: (id: string | null) => void;
  registerChannelServer: (channelId: string, serverId: string) => void;

  // Server unreads — white pill on server icon left edge + count badge
  unreadServers: Record<string, number>;
}

const SocketContext = createContext<SocketContextType | undefined>(undefined);

export const SocketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState<string[]>([]);
  const [presenceOverrides, setPresenceOverrides] = useState<Record<string, boolean>>({});

  // DM unread state
  const [unreadDMs, setUnreadDMs] = useState<Record<string, number>>({});
  const activeDMConvRef = useRef<string | null>(null);

  // Channel unread state
  const [unreadChannels, setUnreadChannels] = useState<Record<string, number>>({});
  const activeChannelRef = useRef<string | null>(null);

  // Channel → Server mapping (built from incoming socket events + explicit registration)
  const [channelServerMap, setChannelServerMap] = useState<Record<string, string>>({});

  // Derived: server unread counts from channel unreads + the mapping
  const unreadServers = useMemo(() => {
    const result: Record<string, number> = {};
    for (const [channelId, count] of Object.entries(unreadChannels)) {
      const serverId = channelServerMap[channelId];
      if (serverId && count > 0) {
        result[serverId] = (result[serverId] ?? 0) + count;
      }
    }
    return result;
  }, [unreadChannels, channelServerMap]);

  // ── DM helpers ────────────────────────────────────────────────────────────
  const markDMRead = useCallback((conversationId: string) => {
    activeDMConvRef.current = conversationId;
    setUnreadDMs(prev => {
      if (!prev[conversationId]) return prev;
      const next = { ...prev };
      delete next[conversationId];
      return next;
    });
  }, []);

  const setActiveDMConversation = useCallback((id: string | null) => {
    activeDMConvRef.current = id;
    if (id) {
      setUnreadDMs(prev => {
        if (!prev[id]) return prev;
        const next = { ...prev };
        delete next[id];
        return next;
      });
    }
  }, []);

  // ── Channel helpers ───────────────────────────────────────────────────────
  const markChannelRead = useCallback((channelId: string) => {
    activeChannelRef.current = channelId;
    setUnreadChannels(prev => {
      if (!prev[channelId]) return prev;
      const next = { ...prev };
      delete next[channelId];
      return next;
    });
  }, []);

  const setActiveChannelId = useCallback((id: string | null) => {
    activeChannelRef.current = id;
    if (id) {
      setUnreadChannels(prev => {
        if (!prev[id]) return prev;
        const next = { ...prev };
        delete next[id];
        return next;
      });
    }
  }, []);

  const registerChannelServer = useCallback((channelId: string, serverId: string) => {
    setChannelServerMap(prev =>
      prev[channelId] === serverId ? prev : { ...prev, [channelId]: serverId }
    );
  }, []);

  // ── Socket setup ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!user) return;
    const token = localStorage.getItem('token');
    if (!token) return;

    const newSocket = io(`${API_BASE_URL}`, { auth: { token } });

    const handleConnect = () => {
      setIsConnected(true);
      newSocket.emit('setup', user.id);
    };

    newSocket.on('connect', handleConnect);

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

    // DM unread tracking
    newSocket.on('new_direct_message', (msg: any) => {
      const convId = msg.conversationId;
      const senderId = msg.sender?.id;
      if (!convId || senderId === user.id) return;
      if (convId === activeDMConvRef.current) return;
      setUnreadDMs(prev => ({ ...prev, [convId]: (prev[convId] ?? 0) + 1 }));
    });

    // Channel unread tracking via server-room broadcast.
    // The backend emits `channel-unread` to `server:<id>` rooms (all server members),
    // so this fires even when the user is in a different channel or not in the channel room.
    // This is separate from `new-message` (which goes only to the active channel room).
    newSocket.on('channel-unread', (msg: any) => {
      const channelId = msg.channelId;
      const serverId = msg.serverId;
      const senderId = msg.senderId;
      if (!channelId || senderId === user.id) return;
      if (channelId === activeChannelRef.current) return;

      setUnreadChannels(prev => ({ ...prev, [channelId]: (prev[channelId] ?? 0) + 1 }));

      if (serverId) {
        setChannelServerMap(prev =>
          prev[channelId] === serverId ? prev : { ...prev, [channelId]: serverId }
        );
      }
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
      unreadDMs, markDMRead, setActiveDMConversation,
      unreadChannels, markChannelRead, setActiveChannelId, registerChannelServer,
      unreadServers,
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
