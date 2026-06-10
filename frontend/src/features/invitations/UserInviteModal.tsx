import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Search, UserPlus, Check, X } from 'lucide-react';
import { API_BASE_URL } from '../../config';

interface UserInviteModalProps {
  serverId: string;
  serverName: string;
  onClose: () => void;
}

export const UserInviteModal: React.FC<UserInviteModalProps> = ({ serverId, serverName, onClose }) => {
  const [query, setQuery] = useState('');
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [invitedUsers, setInvitedUsers] = useState<Set<string>>(new Set());
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchUsers = async () => {
      if (!query.trim()) {
        setUsers([]);
        return;
      }
      setLoading(true);
      try {
        const token = localStorage.getItem('token');
        const res = await axios.get(`${API_BASE_URL}/api/users/search?q=${query}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.data.success) {
          setUsers(res.data.data);
        }
      } catch (err) {
        console.error('Failed to search users', err);
      } finally {
        setLoading(false);
      }
    };

    const debounce = setTimeout(fetchUsers, 300);
    return () => clearTimeout(debounce);
  }, [query]);

  const handleInvite = async (receiverId: string) => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.post(`${API_BASE_URL}/api/servers/${serverId}/invite-user`, 
        { receiverId },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (res.data.success) {
        setInvitedUsers((prev) => {
          const newSet = new Set(prev);
          newSet.add(receiverId);
          return newSet;
        });
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to send invite');
      setTimeout(() => setError(''), 3000);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-[#313338] p-6 rounded-lg w-[440px] shadow-xl">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-white">Invite friends to {serverName}</h2>
          <button onClick={onClose} className="text-text-muted hover:text-white transition-colors">
            <X size={24} />
          </button>
        </div>

        <div className="relative mb-4">
          <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
            <Search size={16} className="text-text-muted" />
          </div>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full bg-[#1e1f22] text-text-normal py-2 pl-10 pr-4 rounded border border-transparent focus:outline-none"
            placeholder="Search for friends"
            autoFocus
          />
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500 text-red-500 text-sm p-2 rounded mb-4">
            {error}
          </div>
        )}

        <div className="h-64 overflow-y-auto custom-scrollbar -mx-2 px-2">
          {loading ? (
            <div className="text-center text-text-muted mt-8">Searching...</div>
          ) : users.length === 0 && query ? (
            <div className="text-center text-text-muted mt-8">No friends found</div>
          ) : users.map((user) => (
            <div key={user._id} className="flex items-center justify-between p-2 hover:bg-white/5 rounded transition-colors group">
              <div className="flex items-center">
                <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-white font-bold mr-3 shrink-0">
                  {user.username.charAt(0).toUpperCase()}
                </div>
                <span className="font-medium text-white">{user.username}</span>
              </div>
              <button
                onClick={() => handleInvite(user._id)}
                disabled={invitedUsers.has(user._id)}
                className={`px-4 py-1.5 rounded text-sm font-medium transition-colors ${
                  invitedUsers.has(user._id)
                    ? 'bg-transparent border border-[#23a559] text-[#23a559] cursor-default'
                    : 'bg-[#23a559] hover:bg-[#1a7c43] text-white'
                }`}
              >
                {invitedUsers.has(user._id) ? 'Sent' : 'Invite'}
              </button>
            </div>
          ))}
          {users.length === 0 && !query && (
             <div className="text-center text-text-muted mt-8 text-sm">
                Type a username to start searching.
             </div>
          )}
        </div>

        <div className="mt-4 pt-4 border-t border-divider text-xs text-text-muted">
          Looking for invite links? Use the Server Settings instead.
        </div>
      </div>
    </div>
  );
};
