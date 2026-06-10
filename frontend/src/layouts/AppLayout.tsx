import React, { useState, useEffect } from 'react';
import { Routes, Route, Outlet } from 'react-router-dom';
import axios from 'axios';
import { ServerSidebar } from '../features/servers/ServerSidebar';
import { ChannelSidebar } from '../features/channels/ChannelSidebar';
import { ChatArea } from '../features/chat/ChatArea';
import { useAuth } from '../features/auth/AuthContext';

const ServerLayout = () => (
  <>
    <ChannelSidebar />
    <Outlet />
  </>
);

export const AppLayout: React.FC = () => {
  const { user } = useAuth();
  const [servers, setServers] = useState<any[]>([]);

  useEffect(() => {
    const fetchServers = async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await axios.get('http://localhost:5000/api/servers', {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.data.success) {
          setServers(res.data.data);
        }
      } catch (err) {
        console.error('Failed to fetch servers', err);
      }
    };
    fetchServers();
  }, []);

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-background text-text-normal">
      <ServerSidebar servers={servers} onServerCreated={(s) => setServers([...servers, s])} />

      <Routes>
        <Route path="@me" element={
          <div className="flex-1 flex items-center justify-center bg-channel-bg">
            <div className="text-center">
              <h2 className="text-xl font-bold text-white mb-2">Welcome, {user?.username}</h2>
              <p className="text-text-muted">Select a server or create one to start chatting!</p>
            </div>
          </div>
        } />
        
        <Route path=":serverId" element={<ServerLayout />}>
          <Route path="" element={<div className="flex-1 bg-background flex items-center justify-center text-text-muted">Select a channel</div>} />
          <Route path=":channelId" element={<ChatArea />} />
        </Route>
      </Routes>
    </div>
  );
};
