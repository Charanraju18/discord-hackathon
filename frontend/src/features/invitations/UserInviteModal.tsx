import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Search, X, Copy, Check } from 'lucide-react';
import { API_BASE_URL } from '../../config';

interface UserInviteModalProps {
  serverId: string;
  serverName: string;
  onClose: () => void;
}

export const UserInviteModal: React.FC<UserInviteModalProps> = ({ serverId, serverName, onClose }) => {
  const [query, setQuery] = useState('');
  const [friends, setFriends] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [invitedIds, setInvitedIds] = useState<Set<string>>(new Set());
  const [inviteCode, setInviteCode] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [linkLoading, setLinkLoading] = useState(false);

  useEffect(() => {
    const fetchFriends = async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await axios.get(`${API_BASE_URL}/api/friends`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const list = Array.isArray(res.data) ? res.data : [];
        setFriends(list.map((f: any) => f.friend));
      } catch (err) {
        console.error('Failed to load friends', err);
      } finally {
        setLoading(false);
      }
    };

    const generateLink = async () => {
      setLinkLoading(true);
      try {
        const token = localStorage.getItem('token');
        const res = await axios.post(
          `${API_BASE_URL}/api/servers/${serverId}/invites`,
          {},
          { headers: { Authorization: `Bearer ${token}` } }
        );
        if (res.data?.code) setInviteCode(res.data.code);
      } catch (err) {
        console.error('Failed to generate invite link', err);
      } finally {
        setLinkLoading(false);
      }
    };

    fetchFriends();
    generateLink();
  }, [serverId]);

  const filteredFriends = friends.filter(f =>
    f.username.toLowerCase().includes(query.toLowerCase())
  );

  const handleInvite = async (friendId: string) => {
    if (!inviteCode) return;
    try {
      const token = localStorage.getItem('token');
      // Start or find DM with this friend
      const dmRes = await axios.post(
        `${API_BASE_URL}/api/dms/start`,
        { friendId },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const conversationId = dmRes.data?.id;
      if (conversationId) {
        // Send the invite URL as a message in the DM
        const inviteUrl = `${window.location.origin}/invite/${inviteCode}`;
        await axios.post(
          `${API_BASE_URL}/api/dms/${conversationId}/messages`,
          { content: inviteUrl, attachments: [] },
          { headers: { Authorization: `Bearer ${token}` } }
        );
      }
      setInvitedIds(prev => new Set([...prev, friendId]));
    } catch (err: any) {
      console.error('Failed to invite user', err);
    }
  };

  const handleCopy = () => {
    if (!inviteCode) return;
    navigator.clipboard.writeText(`${window.location.origin}/invite/${inviteCode}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const inviteUrl = inviteCode ? `${window.location.origin}/invite/${inviteCode}` : '';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={onClose}>
      <div
        className="bg-background w-full max-w-110 rounded-lg shadow-2xl overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-4 pt-4 pb-2 flex items-start justify-between">
          <div>
            <h2 className="text-xl font-bold text-white">Invite friends to {serverName}</h2>
            <p className="text-text-muted text-sm mt-0.5">Recipients will land in <span className="font-medium"># general</span></p>
          </div>
          <button onClick={onClose} className="text-text-muted hover:text-white transition-colors mt-0.5 p-1">
            <X size={20} />
          </button>
        </div>

        {/* Search */}
        <div className="px-4 pt-2 pb-3">
          <div className="relative">
            <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
              <Search size={16} className="text-text-muted" />
            </div>
            <input
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search for friends"
              autoFocus
              className="w-full bg-server-bg text-text-normal py-2.5 pl-9 pr-4 rounded text-sm border border-transparent focus:outline-none focus:border-primary/50 placeholder:text-text-muted"
            />
          </div>
        </div>

        {/* Friends list */}
        <div className="overflow-y-auto max-h-75 custom-scrollbar px-2">
          {loading ? (
            <div className="text-center text-text-muted py-8 text-sm">Loading friends...</div>
          ) : filteredFriends.length === 0 ? (
            <div className="text-center text-text-muted py-8 text-sm">
              {query ? 'No friends match your search.' : 'No friends to invite yet.'}
            </div>
          ) : (
            filteredFriends.map(friend => (
              <div key={friend.id} className="flex items-center justify-between px-2 py-2 hover:bg-white/5 rounded transition-colors group">
                <div className="flex items-center min-w-0">
                  <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-white font-bold text-sm mr-3 shrink-0">
                    {friend.username.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <div className="font-medium text-white text-sm truncate">{friend.username}</div>
                    <div className="text-xs text-text-muted truncate">{friend.username}</div>
                  </div>
                </div>
                <button
                  onClick={() => handleInvite(friend.id)}
                  disabled={invitedIds.has(friend.id)}
                  className={`ml-3 px-4 py-1.5 rounded text-sm font-medium transition-colors shrink-0 ${
                    invitedIds.has(friend.id)
                      ? 'bg-transparent border border-divider text-text-muted cursor-default'
                      : 'bg-[#4e5058] hover:bg-[#6d6f78] text-white'
                  }`}
                >
                  {invitedIds.has(friend.id) ? 'Invited' : 'Invite'}
                </button>
              </div>
            ))
          )}
        </div>

        {/* Invite link section */}
        <div className="px-4 py-4 border-t border-divider mt-2">
          <p className="text-xs font-bold text-text-muted uppercase mb-2">Or, send a server invite link to a friend</p>
          <div className="flex items-center bg-server-bg rounded overflow-hidden">
            <input
              type="text"
              readOnly
              value={linkLoading ? 'Generating link...' : inviteUrl}
              className="flex-1 bg-transparent text-text-normal text-sm px-3 py-2 outline-none truncate"
            />
            <button
              onClick={handleCopy}
              disabled={!inviteCode}
              className={`px-4 py-2 text-sm font-semibold transition-colors shrink-0 ${
                copied
                  ? 'bg-[#23a559] text-white'
                  : 'bg-primary hover:bg-primary-hover text-white disabled:opacity-50'
              }`}
            >
              {copied ? (
                <span className="flex items-center gap-1"><Check size={14} /> Copied</span>
              ) : (
                <span className="flex items-center gap-1"><Copy size={14} /> Copy</span>
              )}
            </button>
          </div>
          <p className="text-xs text-text-muted mt-2">
            Your invite link expires in 30 days.{' '}
            <button className="text-primary hover:underline" onClick={() => {}}>Edit invite link.</button>
          </p>
        </div>
      </div>
    </div>
  );
};
