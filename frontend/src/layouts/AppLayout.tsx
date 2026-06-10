import React, { useState, useEffect } from 'react';
import { Routes, Route, Outlet } from 'react-router-dom';
import axios from 'axios';
import { ServerSidebar } from '../features/servers/ServerSidebar';
import { ChannelSidebar } from '../features/channels/ChannelSidebar';
import { ChatArea } from '../features/chat/ChatArea';
import { API_BASE_URL } from '../config';
import { SecondarySidebarLayout } from './SecondarySidebarLayout';
import { FriendsSidebar } from '../features/friends/FriendsSidebar';
import { FriendsDashboard } from '../features/friends/FriendsDashboard';

const ServerLayout = () => (
  <>
    <SecondarySidebarLayout>
      <ChannelSidebar />
    </SecondarySidebarLayout>
    <Outlet />
  </>
);

const MeLayout = () => {
  const [activeTab, setActiveTab] = useState('online');
  const [pendingCount, setPendingCount] = useState(0);

  return (
    <>
      <SecondarySidebarLayout>
        <FriendsSidebar 
          activeTab={activeTab} 
          setActiveTab={setActiveTab} 
          pendingCount={pendingCount} 
        />
      </SecondarySidebarLayout>
      <FriendsDashboard 
        activeTab={activeTab} 
        onCountsUpdate={setPendingCount} 
      />
    </>
  );
};

export const AppLayout: React.FC = () => {
  const [servers, setServers] = useState<any[]>([]);

  useEffect(() => {
    const fetchServers = async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await axios.get(`${API_BASE_URL}/api/servers`, {
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
        <Route path="@me" element={<MeLayout />} />
        
        <Route path=":serverId" element={<ServerLayout />}>
          <Route path="" element={<div className="flex-1 bg-background flex items-center justify-center text-text-muted">Select a channel</div>} />
          <Route path=":channelId" element={<ChatArea />} />
        </Route>
      </Routes>
    </div>
  );
};
