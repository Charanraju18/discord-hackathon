import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';
import { useSocket } from '../socket/SocketContext';
import { useAuth } from '../auth/AuthContext';
import { API_BASE_URL } from '../../config';

interface NotificationContextType {
  notifications: any[];
  unreadCount: number;
  markAsRead: (id: string) => void;
  refreshNotifications: () => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [notifications, setNotifications] = useState<any[]>([]);
  const { socket } = useSocket();
  const { user } = useAuth();

  const fetchNotifications = async () => {
    if (!user) return;
    try {
      const token = localStorage.getItem('token');
      // We could have a unified GET /api/notifications, but since we rely on 
      // requests and invites, we fetch them here and format them as unified notifications.
      // However, we also added a generic Notification schema in 4.1.
      
      const [invitesRes, friendReqRes, generalNotifRes] = await Promise.all([
        axios.get(`${API_BASE_URL}/api/server-invitations/pending`, { headers: { Authorization: `Bearer ${token}` } }),
        axios.get(`${API_BASE_URL}/api/friends/requests`, { headers: { Authorization: `Bearer ${token}` } }),
        // We need an endpoint for generic notifications if we want to show them.
        // For MVP, we'll just merge invites and friend requests.
      ]);

      const merged: any[] = [];
      
      if (invitesRes.data.success) {
        invitesRes.data.data.forEach((inv: any) => {
          merged.push({
            id: inv._id,
            type: 'server_invitation',
            data: inv,
            createdAt: inv.createdAt
          });
        });
      }

      if (friendReqRes.data.success) {
        friendReqRes.data.data.incoming.forEach((req: any) => {
          merged.push({
            id: req._id,
            type: 'friend_request',
            data: req,
            createdAt: req.createdAt
          });
        });
      }

      merged.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
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
      // It can be a fully formed notification from the backend
      setNotifications(prev => [notif, ...prev]);
    };

    socket.on('notification-created', handleNotification);
    
    return () => {
      socket.off('notification-created', handleNotification);
    };
  }, [socket]);

  const markAsRead = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  return (
    <NotificationContext.Provider value={{
      notifications,
      unreadCount: notifications.length,
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
