import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useSocket } from '../socket/SocketContext';
import { useAuth } from '../auth/AuthContext';
import { API_BASE_URL } from '../../config';

interface ServersContextType {
  servers: any[];
  addServer: (server: any) => void;
  isJoinedServer: (serverId: string) => boolean;
}

const ServersContext = createContext<ServersContextType | undefined>(undefined);

export const ServersProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [servers, setServers] = useState<any[]>([]);
  const { socket } = useSocket();
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;
    const fetchServers = async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await axios.get(`${API_BASE_URL}/api/servers`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setServers(Array.isArray(res.data) ? res.data : []);
      } catch (err) {
        console.error('Failed to fetch servers', err);
      }
    };
    fetchServers();
  }, [user]);

  useEffect(() => {
    if (!socket) return;

    const handleServerJoined = (data: any) => {
      if (!data?.server) return;
      setServers(prev => {
        if (prev.some(s => s.id === data.server.id)) return prev;
        return [...prev, data.server];
      });
    };

    socket.on('server_joined', handleServerJoined);
    return () => { socket.off('server_joined', handleServerJoined); };
  }, [socket]);

  const addServer = useCallback((server: any) => {
    setServers(prev => {
      if (prev.some(s => s.id === server.id)) return prev;
      return [...prev, server];
    });
  }, []);

  const isJoinedServer = useCallback((serverId: string) => {
    return servers.some(s => s.id === serverId);
  }, [servers]);

  return (
    <ServersContext.Provider value={{ servers, addServer, isJoinedServer }}>
      {children}
    </ServersContext.Provider>
  );
};

export const useServers = () => {
  const ctx = useContext(ServersContext);
  if (!ctx) throw new Error('useServers must be used within ServersProvider');
  return ctx;
};
