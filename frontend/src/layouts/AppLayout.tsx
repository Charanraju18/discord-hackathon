import React, { useState, useEffect } from 'react';
import { Routes, Route, Outlet } from 'react-router-dom';
import axios from 'axios';
import { ServerSidebar } from '../features/servers/ServerSidebar';
import { ChannelSidebar } from '../features/channels/ChannelSidebar';
import { ChannelRouter } from '../features/channels/ChannelRouter';
import { API_BASE_URL } from '../config';
import { SecondarySidebarLayout } from './SecondarySidebarLayout';
import { FriendsSidebar } from '../features/friends/FriendsSidebar';
import { FriendsDashboard } from '../features/friends/FriendsDashboard';
import { DirectMessagesSidebar } from '../features/dms/DirectMessagesSidebar';
import { DirectMessageView } from '../features/dms/DirectMessageView';

const ServerLayout = () => (
  <>
    <SecondarySidebarLayout>
      <ChannelSidebar />
    </SecondarySidebarLayout>
    <Outlet />
  </>
);

const MeLayout = () => (
  <>
    <SecondarySidebarLayout>
      <FriendsSidebar />
      <DirectMessagesSidebar />
    </SecondarySidebarLayout>
    <Routes>
      <Route path="" element={<FriendsDashboard />} />
      <Route path=":conversationId" element={<DirectMessageView />} />
    </Routes>
  </>
);

export const AppLayout: React.FC = () => {
  const [servers, setServers] = useState<any[]>([]);

  useEffect(() => {
    const fetchServers = async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await axios.get(`${API_BASE_URL}/api/servers`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        // FastAPI returns array directly (no success wrapper)
        setServers(Array.isArray(res.data) ? res.data : []);
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
        <Route path="@me/*" element={<MeLayout />} />

        <Route path=":serverId" element={<ServerLayout />}>
          <Route path="" element={<div className="flex-1 bg-background flex items-center justify-center text-text-muted">Select a channel</div>} />
          <Route path=":channelId" element={<ChannelRouter />} />
        </Route>
      </Routes>
    </div>
  );
};
