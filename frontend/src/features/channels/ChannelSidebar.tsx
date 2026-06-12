import React, { useState, useEffect, useCallback } from 'react';
import { useParams, NavLink } from 'react-router-dom';
import axios from 'axios';
import { Hash, Plus, UserPlus, Volume2, ChevronDown, ChevronRight } from 'lucide-react';
import { useAuth } from '../auth/AuthContext';
import { useVoice } from '../rtc/hooks/useWebRTC';
import { UserInviteModal } from '../invitations/UserInviteModal';
import { API_BASE_URL } from '../../config';
import { useSocket } from '../socket/SocketContext';

interface Channel {
  id: string;
  name: string;
  type: string;
  categoryId: string | null;
  position: number;
}

interface Category {
  id: string;
  name: string;
  position: number;
}

interface ContextMenuState {
  x: number;
  y: number;
  type: 'category' | 'channel';
  id: string;
  name: string;
  hasChannels?: boolean;
}

interface ConfirmState {
  type: 'category' | 'channel';
  id: string;
  name: string;
  hasChannels?: boolean;
}

export const ChannelSidebar: React.FC = () => {
  const { serverId } = useParams<{ serverId: string }>();
  const [channels, setChannels] = useState<Channel[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [server, setServer] = useState<any>(null);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [showChannelModal, setShowChannelModal] = useState(false);
  const [showUserInviteModal, setShowUserInviteModal] = useState(false);
  const [newChannelName, setNewChannelName] = useState('');
  const [newChannelType, setNewChannelType] = useState('text');
  const [newChannelCategory, setNewChannelCategory] = useState<string | null>(null);
  const [showServerMenu, setShowServerMenu] = useState(false);
  const [createCategoryMode, setCreateCategoryMode] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<ConfirmState | null>(null);

  const { user } = useAuth();
  const { currentVoiceChannelId, participants } = useVoice();
  const { unreadChannels, socket } = useSocket();

  const isOwner = !!(server && user && server.ownerId === user.id);

  const fetchData = useCallback(async () => {
    if (!serverId) return;
    const token = localStorage.getItem('token');
    try {
      const [chRes, catRes] = await Promise.all([
        axios.get(`${API_BASE_URL}/api/channels/${serverId}`, { headers: { Authorization: `Bearer ${token}` } }),
        axios.get(`${API_BASE_URL}/api/categories/${serverId}`, { headers: { Authorization: `Bearer ${token}` } }),
      ]);
      setChannels(Array.isArray(chRes.data) ? chRes.data : []);
      setCategories(Array.isArray(catRes.data) ? catRes.data : []);
    } catch (err) {
      console.error('Failed to fetch channels/categories', err);
    }
  }, [serverId]);

  const fetchServer = useCallback(async () => {
    if (!serverId) return;
    const token = localStorage.getItem('token');
    try {
      const res = await axios.get(`${API_BASE_URL}/api/servers`, { headers: { Authorization: `Bearer ${token}` } });
      const list = Array.isArray(res.data) ? res.data : [];
      const found = list.find((s: any) => s.id === serverId);
      if (found) setServer(found);
    } catch { /* ignore */ }
  }, [serverId]);

  useEffect(() => {
    fetchData();
    fetchServer();
  }, [fetchData, fetchServer]);

  // Real-time category / channel updates
  useEffect(() => {
    if (!socket || !serverId) return;

    const onCategoryCreated = (cat: any) => {
      if (cat.serverId !== serverId) return;
      setCategories(prev => [...prev, cat].sort((a, b) => a.position - b.position));
    };

    const onCategoryDeleted = ({ categoryId, serverId: sid, deletedChannelIds }: any) => {
      if (sid !== serverId) return;
      setCategories(prev => prev.filter(c => c.id !== categoryId));
      setChannels(prev => prev.filter(c => !deletedChannelIds.includes(c.id)));
    };

    const onChannelCreated = (ch: any) => {
      if (ch.serverId !== serverId) return;
      setChannels(prev => prev.some(c => c.id === ch.id) ? prev : [...prev, ch]);
    };

    const onChannelDeleted = ({ channelId, serverId: sid }: any) => {
      if (sid !== serverId) return;
      setChannels(prev => prev.filter(c => c.id !== channelId));
    };

    socket.on('category_created', onCategoryCreated);
    socket.on('category_deleted', onCategoryDeleted);
    socket.on('channel_created', onChannelCreated);
    socket.on('channel_deleted', onChannelDeleted);

    return () => {
      socket.off('category_created', onCategoryCreated);
      socket.off('category_deleted', onCategoryDeleted);
      socket.off('channel_created', onChannelCreated);
      socket.off('channel_deleted', onChannelDeleted);
    };
  }, [socket, serverId]);

  // Close context menu on outside click
  useEffect(() => {
    if (!contextMenu) return;
    const close = () => setContextMenu(null);
    document.addEventListener('click', close);
    return () => document.removeEventListener('click', close);
  }, [contextMenu]);

  // Close server menu on outside click
  useEffect(() => {
    if (!showServerMenu) return;
    const close = () => setShowServerMenu(false);
    document.addEventListener('click', close);
    return () => document.removeEventListener('click', close);
  }, [showServerMenu]);

  const handleCreateChannel = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const token = localStorage.getItem('token');
    try {
      const res = await axios.post(
        `${API_BASE_URL}/api/channels`,
        { name: newChannelName, serverId, type: newChannelType, categoryId: newChannelCategory },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (res.data?.id) {
        // Optimistic add for creator (socket also fires for all members)
        setChannels(prev => prev.some(c => c.id === res.data.id) ? prev : [...prev, res.data]);
        setShowChannelModal(false);
        setNewChannelName('');
        setNewChannelType('text');
        setNewChannelCategory(null);
      }
    } catch (err) {
      console.error('Failed to create channel', err);
    }
  };

  const handleCreateCategory = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!newCategoryName.trim()) return;
    const token = localStorage.getItem('token');
    try {
      await axios.post(
        `${API_BASE_URL}/api/categories`,
        { serverId, name: newCategoryName.trim() },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      // Socket event will add it to state for all members including creator
      setCreateCategoryMode(false);
      setNewCategoryName('');
    } catch (err) {
      console.error('Failed to create category', err);
    }
  };

  const handleDeleteCategory = async (categoryId: string) => {
    const token = localStorage.getItem('token');
    try {
      await axios.delete(`${API_BASE_URL}/api/categories/${categoryId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      // Socket event handles state update for all members
    } catch (err) {
      console.error('Failed to delete category', err);
    }
    setConfirmDelete(null);
  };

  const handleDeleteChannel = async (channelId: string) => {
    const token = localStorage.getItem('token');
    try {
      await axios.delete(`${API_BASE_URL}/api/channels/${channelId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      // Socket event handles state update for all members
    } catch (err) {
      console.error('Failed to delete channel', err);
    }
    setConfirmDelete(null);
  };

  const openContextMenu = (e: React.MouseEvent, type: 'category' | 'channel', id: string, name: string) => {
    e.preventDefault();
    e.stopPropagation();
    const hasChannels = type === 'category' ? channels.some(c => c.categoryId === id) : false;
    setContextMenu({ x: e.clientX, y: e.clientY, type, id, name, hasChannels });
  };

  const sortedCategories = [...categories].sort((a, b) => a.position - b.position);
  const uncategorized = channels.filter(c => !c.categoryId).sort((a, b) => a.position - b.position);

  const renderChannel = (channel: Channel) => {
    const unread = (unreadChannels[channel.id] ?? 0) > 0;
    const isVoice = channel.type === 'voice';
    const isActiveVoice = currentVoiceChannelId === channel.id;

    return (
      <div key={channel.id}>
        <NavLink
          to={`/channels/${serverId}/${channel.id}`}
          onContextMenu={isOwner ? (e) => openContextMenu(e, 'channel', channel.id, channel.name) : undefined}
          className={({ isActive }) =>
            `flex items-center px-2 py-1.5 rounded hover:bg-white/5 hover:text-interactive-hover transition-colors ${
              isActive || isActiveVoice
                ? 'bg-white/10 text-interactive-active'
                : unread ? 'text-white' : 'text-text-muted'
            }`
          }
        >
          {isVoice
            ? <Volume2 size={20} className="mr-1.5 shrink-0 text-text-muted" />
            : <Hash size={20} className="mr-1.5 shrink-0 text-text-muted" />}
          <span className={`truncate flex-1 ${unread ? 'font-semibold' : 'font-medium'}`}>{channel.name}</span>
          {unread && <div className="w-2 h-2 rounded-full bg-white shrink-0 ml-1" />}
        </NavLink>
        {isActiveVoice && (
          <div className="ml-6 mt-0.5 space-y-0.5">
            <div className="flex items-center text-text-muted text-sm px-2 py-0.5 hover:bg-white/5 rounded">
              <img
                src={`https://ui-avatars.com/api/?name=${user?.username}&background=random`}
                alt=""
                className="w-5 h-5 rounded-full mr-2"
              />
              <span className="truncate text-xs">{user?.username}</span>
            </div>
            {Object.entries(participants).map(([uid, state]) => (
              <div key={uid} className="flex items-center text-text-muted text-sm px-2 py-0.5 hover:bg-white/5 rounded">
                <img
                  src={`https://ui-avatars.com/api/?name=${state.username || 'User'}&background=random`}
                  alt=""
                  className="w-5 h-5 rounded-full mr-2"
                />
                <span className="truncate text-xs">{state.username || 'User'}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full w-full bg-channel-bg">
      {/* Server Header */}
      <div className="h-12 border-b border-divider flex items-center px-4 font-bold text-white shadow-sm relative shrink-0">
        <button
          className="flex-1 text-left flex items-center gap-1 min-w-0 hover:text-white/80 transition-colors"
          onClick={(e) => { e.stopPropagation(); setShowServerMenu(v => !v); }}
        >
          <span className="truncate">{server?.name ?? 'Server'}</span>
          <ChevronDown size={14} className="shrink-0 text-text-muted" />
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); setShowUserInviteModal(true); }}
          className="text-text-muted hover:text-white transition-colors p-1 flex items-center justify-center rounded shrink-0 ml-1"
          title="Invite People"
        >
          <UserPlus size={18} />
        </button>

        {/* Server dropdown */}
        {showServerMenu && (
          <div
            className="absolute top-12 left-0 right-0 mx-2 bg-[#111214] rounded-md shadow-xl py-1 z-50 border border-white/10"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="w-full text-left px-3 py-2 text-sm text-text-normal hover:bg-primary hover:text-white transition-colors flex items-center gap-2"
              onClick={() => { setShowUserInviteModal(true); setShowServerMenu(false); }}
            >
              <UserPlus size={15} /> Invite People
            </button>
            {isOwner && (
              <>
                <div className="h-px bg-white/10 my-1 mx-2" />
                <button
                  className="w-full text-left px-3 py-2 text-sm text-text-normal hover:bg-primary hover:text-white transition-colors flex items-center gap-2"
                  onClick={() => { setCreateCategoryMode(true); setShowServerMenu(false); }}
                >
                  <Plus size={15} /> Create Category
                </button>
                <button
                  className="w-full text-left px-3 py-2 text-sm text-text-normal hover:bg-primary hover:text-white transition-colors flex items-center gap-2"
                  onClick={() => { setNewChannelType('text'); setNewChannelCategory(null); setShowChannelModal(true); setShowServerMenu(false); }}
                >
                  <Hash size={15} /> Create Text Channel
                </button>
                <button
                  className="w-full text-left px-3 py-2 text-sm text-text-normal hover:bg-primary hover:text-white transition-colors flex items-center gap-2"
                  onClick={() => { setNewChannelType('voice'); setNewChannelCategory(null); setShowChannelModal(true); setShowServerMenu(false); }}
                >
                  <Volume2 size={15} /> Create Voice Channel
                </button>
              </>
            )}
          </div>
        )}
      </div>

      {/* Channel List */}
      <div className="flex-1 overflow-y-auto py-3 px-2 custom-scrollbar">
        {/* Inline category creation */}
        {createCategoryMode && (
          <form onSubmit={handleCreateCategory} className="mb-3 px-1">
            <input
              autoFocus
              type="text"
              placeholder="Category name"
              value={newCategoryName}
              onChange={e => setNewCategoryName(e.target.value)}
              className="w-full bg-server-bg text-white text-xs px-2 py-1.5 rounded border border-primary/60 focus:outline-none focus:border-primary"
            />
            <div className="flex gap-1 mt-1">
              <button type="submit" className="text-xs bg-primary hover:bg-primary-hover text-white px-3 py-1 rounded transition-colors">Create</button>
              <button type="button" onClick={() => { setCreateCategoryMode(false); setNewCategoryName(''); }} className="text-xs text-text-muted hover:text-white px-2 py-1 transition-colors">Cancel</button>
            </div>
          </form>
        )}

        {/* Uncategorized channels */}
        {uncategorized.length > 0 && (
          <div className="mb-3">
            <div className="flex items-center justify-between text-text-muted hover:text-text-normal mb-0.5 px-2 group">
              <span className="text-[11px] font-bold uppercase tracking-wider">Channels</span>
              {isOwner && (
                <button
                  title="Add Channel"
                  className="opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={() => { setNewChannelCategory(null); setShowChannelModal(true); }}
                >
                  <Plus size={15} />
                </button>
              )}
            </div>
            <div className="space-y-0.5">{uncategorized.map(renderChannel)}</div>
          </div>
        )}

        {/* Categories */}
        {sortedCategories.map(cat => {
          const catChannels = channels
            .filter(c => c.categoryId === cat.id)
            .sort((a, b) => a.position - b.position);
          const isCollapsed = collapsed[cat.id];

          return (
            <div key={cat.id} className="mb-2">
              <div
                className="flex items-center justify-between text-text-muted hover:text-text-normal px-2 py-0.5 cursor-pointer rounded group select-none"
                onClick={() => setCollapsed(prev => ({ ...prev, [cat.id]: !prev[cat.id] }))}
                onContextMenu={isOwner ? (e) => openContextMenu(e, 'category', cat.id, cat.name) : undefined}
              >
                <div className="flex items-center gap-1 min-w-0">
                  {isCollapsed ? <ChevronRight size={11} /> : <ChevronDown size={11} />}
                  <span className="text-[11px] font-bold uppercase tracking-wider truncate">{cat.name}</span>
                </div>
                {isOwner && (
                  <button
                    title="Add Channel to Category"
                    className="opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                    onClick={(e) => { e.stopPropagation(); setNewChannelCategory(cat.id); setShowChannelModal(true); }}
                  >
                    <Plus size={14} />
                  </button>
                )}
              </div>
              {!isCollapsed && catChannels.length > 0 && (
                <div className="space-y-0.5 mt-0.5">{catChannels.map(renderChannel)}</div>
              )}
            </div>
          );
        })}

        {/* Empty state */}
        {channels.length === 0 && categories.length === 0 && isOwner && (
          <div className="px-2 py-6 text-center">
            <p className="text-text-muted text-xs mb-2">No channels yet.</p>
            <button
              onClick={() => setShowChannelModal(true)}
              className="text-primary hover:text-primary-hover text-sm font-medium transition-colors"
            >
              Create a channel
            </button>
          </div>
        )}
      </div>

      {/* Context Menu */}
      {contextMenu && (
        <div
          className="fixed bg-[#111214] rounded-md shadow-xl py-1 z-[100] border border-white/10 min-w-40"
          style={{ top: contextMenu.y, left: contextMenu.x }}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            className="w-full text-left px-3 py-2 text-sm text-[#f23f42] hover:bg-[#f23f42]/10 transition-colors"
            onClick={() => {
              setConfirmDelete({ type: contextMenu.type, id: contextMenu.id, name: contextMenu.name, hasChannels: contextMenu.hasChannels });
              setContextMenu(null);
            }}
          >
            Delete {contextMenu.type === 'category' ? 'Category' : 'Channel'}
          </button>
        </div>
      )}

      {/* Delete Confirmation */}
      {confirmDelete && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[200]" onClick={() => setConfirmDelete(null)}>
          <div className="bg-[#313338] rounded-lg p-6 max-w-sm w-full mx-4 shadow-xl" onClick={e => e.stopPropagation()}>
            <h3 className="text-white font-bold text-lg mb-2">
              Delete {confirmDelete.type === 'category' ? 'Category' : 'Channel'}
            </h3>
            <p className="text-text-muted text-sm mb-5 leading-relaxed">
              {confirmDelete.type === 'category'
                ? confirmDelete.hasChannels
                  ? `Delete "${confirmDelete.name}" and all its channels? This cannot be undone.`
                  : `Delete category "${confirmDelete.name}"? This cannot be undone.`
                : `Delete #${confirmDelete.name}? This cannot be undone.`}
            </p>
            <div className="flex gap-3 justify-end">
              <button onClick={() => setConfirmDelete(null)} className="px-4 py-2 text-sm text-text-normal hover:text-white transition-colors">
                Cancel
              </button>
              <button
                onClick={() => {
                  if (confirmDelete.type === 'category') handleDeleteCategory(confirmDelete.id);
                  else handleDeleteChannel(confirmDelete.id);
                }}
                className="px-4 py-2 text-sm bg-[#f23f42] hover:bg-[#a12d2f] text-white rounded font-medium transition-colors"
              >
                {confirmDelete.type === 'category' && confirmDelete.hasChannels ? 'Delete Everything' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Channel Modal */}
      {showChannelModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-background p-6 rounded-lg w-96 shadow-xl">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-white">Create Channel</h2>
              <button onClick={() => setShowChannelModal(false)} className="text-text-muted hover:text-white">✕</button>
            </div>
            <form onSubmit={handleCreateChannel}>
              <label className="block text-xs font-bold text-text-muted uppercase mb-2">Channel Type</label>
              <div className="flex gap-2 mb-4">
                <button type="button" onClick={() => setNewChannelType('text')} className={`flex-1 py-2 rounded flex justify-center items-center gap-2 ${newChannelType === 'text' ? 'bg-[#3f4147] text-white' : 'bg-channel-bg text-text-muted hover:bg-white/5'}`}>
                  <Hash size={18} /> Text
                </button>
                <button type="button" onClick={() => setNewChannelType('voice')} className={`flex-1 py-2 rounded flex justify-center items-center gap-2 ${newChannelType === 'voice' ? 'bg-[#3f4147] text-white' : 'bg-channel-bg text-text-muted hover:bg-white/5'}`}>
                  <Volume2 size={18} /> Voice
                </button>
              </div>
              {categories.length > 0 && (
                <>
                  <label className="block text-xs font-bold text-text-muted uppercase mb-2">Category (Optional)</label>
                  <select
                    value={newChannelCategory ?? ''}
                    onChange={e => setNewChannelCategory(e.target.value || null)}
                    className="w-full bg-server-bg text-white px-3 py-2 rounded text-sm mb-4 focus:outline-none"
                  >
                    <option value="">No Category</option>
                    {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </>
              )}
              <label className="block text-xs font-bold text-text-muted uppercase mb-2">Channel Name</label>
              <div className="relative mb-6">
                {newChannelType === 'text'
                  ? <Hash size={16} className="absolute left-2.5 top-3 text-text-muted" />
                  : <Volume2 size={16} className="absolute left-2.5 top-3 text-text-muted" />}
                <input
                  type="text"
                  value={newChannelName}
                  onChange={e => setNewChannelName(e.target.value)}
                  className="w-full bg-server-bg text-white py-2.5 pr-2.5 pl-8 rounded border border-transparent focus:outline-none focus:border-blue-500 transition-colors"
                  placeholder="new-channel"
                  required
                />
              </div>
              <div className="flex justify-between items-center bg-channel-bg -mx-6 -mb-6 p-4 rounded-b-lg">
                <button type="button" onClick={() => setShowChannelModal(false)} className="text-text-normal hover:underline text-sm">Cancel</button>
                <button type="submit" className="bg-primary text-white px-6 py-2 rounded font-medium hover:bg-primary-hover transition-colors">Create Channel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* User Invite Modal */}
      {showUserInviteModal && server && (
        <UserInviteModal serverId={server.id} serverName={server.name} onClose={() => setShowUserInviteModal(false)} />
      )}
    </div>
  );
};
