import React, { useState, useEffect } from 'react';
import { useParams, NavLink, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Hash, Plus, Settings, UserPlus, ChevronDown } from 'lucide-react';
import { useAuth } from '../auth/AuthContext';
import { InviteModal } from '../servers/InviteModal';
import { UserInviteModal } from '../invitations/UserInviteModal';
import { API_BASE_URL } from '../../config';

export const ChannelSidebar: React.FC = () => {
  const { serverId } = useParams<{ serverId: string }>();
  const [channels, setChannels] = useState<any[]>([]);
  const [server, setServer] = useState<any>(null);
  const [showChannelModal, setShowChannelModal] = useState(false);
  const [showUserInviteModal, setShowUserInviteModal] = useState(false);
  const [newChannelName, setNewChannelName] = useState('');
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const fetchChannels = async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await axios.get(`${API_BASE_URL}/api/channels/${serverId}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.data.success) {
          setChannels(res.data.data);
        }
      } catch (err) {
        console.error('Failed to fetch channels', err);
      }
    };
    
    // Quick fetch to get server name (in MVP we can just use a generic fetch or let InviteModal handle it)
    const fetchServer = async () => {
       try {
          const token = localStorage.getItem('token');
          const res = await axios.get(`${API_BASE_URL}/api/servers`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          if (res.data.success) {
             const found = res.data.data.find((s: any) => s._id === serverId);
             if (found) setServer(found);
          }
       } catch (err) {}
    };

    if (serverId) {
      fetchChannels();
      fetchServer();
    }
  }, [serverId]);

  const handleCreateChannel = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      const res = await axios.post(`${API_BASE_URL}/api/channels`, 
        { name: newChannelName, serverId },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (res.data.success) {
        setChannels([...channels, res.data.data]);
        setShowChannelModal(false);
        setNewChannelName('');
      }
    } catch (err) {
      console.error('Failed to create channel', err);
    }
  };

  return (
    <div className="flex flex-col h-full w-full bg-channel-bg">
      {/* Server Header */}
      <div className="h-12 border-b border-divider flex items-center justify-between px-4 font-bold text-white shadow-sm cursor-pointer hover:bg-white/5 transition-colors group">
        <span className="truncate">{server ? server.name : 'Server'}</span>
        <button 
          onClick={(e) => {
             e.stopPropagation();
             setShowUserInviteModal(true);
          }}
          className="text-text-muted hover:text-white transition-colors p-1 flex items-center justify-center rounded"
          title="Invite People"
        >
          <UserPlus size={18} />
        </button>
      </div>

      {/* Channel List */}
      <div className="flex-1 overflow-y-auto py-3 px-2 custom-scrollbar">
        <div className="flex items-center justify-between text-text-muted hover:text-text-normal mb-1 px-2 group cursor-pointer" onClick={() => setShowChannelModal(true)}>
          <span className="text-xs font-bold uppercase tracking-wider">Text Channels</span>
          <Plus size={16} className="opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
        
        <div className="space-y-[2px]">
          {channels.map((channel) => (
            <NavLink
              key={channel._id}
              to={`/channels/${serverId}/${channel._id}`}
              className={({ isActive }) => `flex items-center px-2 py-1.5 rounded text-text-muted hover:bg-white/5 hover:text-interactive-hover transition-colors ${isActive ? 'bg-white/10 text-interactive-active' : ''}`}
            >
              <Hash size={20} className="mr-1.5 text-text-muted" />
              <span className="font-medium truncate">{channel.name}</span>
            </NavLink>
          ))}
        </div>
      </div>

      {/* The User Area has been moved to UserPanel.tsx in SecondarySidebarLayout */}

      {/* Create Channel Modal */}
      {showChannelModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-background p-6 rounded-lg w-96 shadow-xl">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-white">Create Channel</h2>
              <button onClick={() => setShowChannelModal(false)} className="text-text-muted hover:text-white">✕</button>
            </div>
            <form onSubmit={handleCreateChannel}>
              <label className="block text-xs font-bold text-text-muted uppercase mb-2">
                Channel Name
              </label>
              <div className="relative mb-6">
                <Hash size={16} className="absolute left-2.5 top-3 text-text-muted" />
                <input
                  type="text"
                  value={newChannelName}
                  onChange={(e) => setNewChannelName(e.target.value)}
                  className="w-full bg-server-bg text-white py-2.5 pr-2.5 pl-8 rounded border border-transparent focus:outline-none"
                  placeholder="new-channel"
                  required
                />
              </div>
              <div className="flex justify-between items-center bg-channel-bg -mx-6 -mb-6 p-4 rounded-b-lg">
                <button type="button" onClick={() => setShowChannelModal(false)} className="text-text-normal hover:underline text-sm">
                  Cancel
                </button>
                <button type="submit" className="bg-primary text-white px-6 py-2 rounded font-medium hover:bg-primary-hover transition-colors">
                  Create Channel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* User Invite Modal */}
      {showUserInviteModal && server && (
        <UserInviteModal 
          serverId={server._id} 
          serverName={server.name} 
          onClose={() => setShowUserInviteModal(false)} 
        />
      )}
    </div>
  );
};
