import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';
import { useSocket } from '../socket/SocketContext';
import { useAuth } from '../auth/AuthContext';
import { API_BASE_URL } from '../../config';

interface Notification {
  id: string;
  type: 'friend_request' | 'dm' | string;
  data: any;
  createdAt?: string;
}

interface NotificationContextType {
  notifications: Notification[];
  unreadCount: number;
  pendingFriendRequests: number;
  markAsRead: (id: string) => void;
  refreshNotifications: () => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const { socket } = useSocket();
  const { user } = useAuth();

  const fetchNotifications = async () => {
    if (!user) return;
    try {
      const token = localStorage.getItem('token');
      // FastAPI returns plain objects, not {success, data} wrappers
      const res = await axios.get(`${API_BASE_URL}/api/friends/requests`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      const merged: Notification[] = [];

      // res.data is { incoming: [...], outgoing: [...], incomingCount: N }
      const incoming: any[] = res.data?.incoming ?? [];
      incoming.forEach((req: any) => {
        merged.push({
          id: req.id,
          type: 'friend_request',
          data: req,
          createdAt: req.createdAt
        });
      });

      merged.sort((a, b) =>
        new Date(b.createdAt ?? 0).getTime() - new Date(a.createdAt ?? 0).getTime()
      );
      setNotifications(merged);
    } catch (err) {
      console.error('Failed to fetch notifications', err);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, [user]);

  useEffect(() => {
    if (!socket) return;

    const handleNotification = (notif: any) => {
      const newNotif: Notification = {
        id: notif.id ?? notif.data?._id ?? notif.data?.id ?? String(Date.now()),
        type: notif.type,
        data: notif.data,
        createdAt: notif.data?.createdAt,
      };
      setNotifications(prev => {
        // Deduplicate by id
        if (prev.find(n => n.id === newNotif.id)) return prev;
        return [newNotif, ...prev];
      });
    };

    socket.on('notification-created', handleNotification);
    return () => { socket.off('notification-created', handleNotification); };
  }, [socket]);

  const markAsRead = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const pendingFriendRequests = notifications.filter(n => n.type === 'friend_request').length;

  return (
    <NotificationContext.Provider value={{
      notifications,
      unreadCount: notifications.length,
      pendingFriendRequests,
      markAsRead,
      refreshNotifications: fetchNotifications
    }}>
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotification = () => {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotification must be used within a NotificationProvider');
  }
  return context;
};
