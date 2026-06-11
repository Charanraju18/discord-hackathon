import React, { useState } from 'react';
import { X, MessageSquare } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { API_BASE_URL } from '../../config';
import { useAuth } from '../../features/auth/AuthContext';
import { getServerInitials } from '../../utils/serverInitials';

interface ProfileUser {
  id: string;
  username: string;
  isOnline?: boolean;
  createdAt?: string;
  mutualServers?: number;
  mutualFriends?: number;
  mutualServersList?: { id: string; name: string; icon?: string }[];
  mutualFriendsList?: { id: string; username: string; isOnline?: boolean }[];
}

interface Props {
  user: ProfileUser;
  onClose: () => void;
}

type Tab = 'activity' | 'friends' | 'servers';

const COLORS = ['#5865f2', '#eb459e', '#ed4245', '#fee75c', '#57f287', '#00b0f4'];
function avatarColor(name: string) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h);
  return COLORS[Math.abs(h) % COLORS.length];
}

export const UserProfileModal: React.FC<Props> = ({ user, onClose }) => {
  const [activeTab, setActiveTab] = useState<Tab>('activity');
  const { user: currentUser } = useAuth();
  const navigate = useNavigate();

  const memberSince = user.createdAt
    ? new Date(user.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    : null;

  const handleMessage = async () => {
    if (!currentUser) return;
    try {
      const token = localStorage.getItem('token');
      const res = await axios.post(
        `${API_BASE_URL}/api/dms/start`,
        { friendId: user.id },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (res.data?.id) {
        navigate(`/app/dms/${res.data.id}`);
        onClose();
      }
    } catch (err) {
      console.error('Failed to open DM', err);
    }
  };

  const color = avatarColor(user.username);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-[#232428] rounded-xl w-[600px] max-h-[90vh] overflow-hidden shadow-2xl relative flex flex-col">
        {/* Close */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 z-10 text-[#b5bac1] hover:text-white transition-colors"
        >
          <X size={20} />
        </button>

        <div className="flex h-full">
          {/* Left panel */}
          <div className="w-[240px] shrink-0 flex flex-col bg-[#1e1f22]">
            {/* Banner */}
            <div
              className="h-[80px] shrink-0"
              style={{ background: `linear-gradient(135deg, ${color}88, ${color}44)` }}
            />

            {/* Avatar */}
            <div className="px-4 -mt-10 pb-3 relative shrink-0">
              <div className="relative inline-block">
                <div
                  className="w-20 h-20 rounded-full flex items-center justify-center text-white text-3xl font-bold border-[5px] border-[#1e1f22]"
                  style={{ backgroundColor: color }}
                >
                  {user.username.charAt(0).toUpperCase()}
                </div>
                <div
                  className={`absolute bottom-1 right-1 w-4 h-4 rounded-full border-[3px] border-[#1e1f22] ${
                    user.isOnline ? 'bg-[#23a559]' : 'bg-[#80848e]'
                  }`}
                />
              </div>
            </div>

            {/* Username */}
            <div className="px-4 pb-3 shrink-0">
              <div className="bg-[#111214] rounded-lg p-3">
                <h2 className="text-lg font-bold text-white leading-tight">{user.username}</h2>
                <p className="text-sm text-[#b5bac1]">{user.username}</p>
              </div>
            </div>

            {/* Action buttons */}
            <div className="px-4 pb-3 flex gap-2 shrink-0">
              <button
                onClick={handleMessage}
                className="flex-1 flex items-center justify-center gap-2 bg-[#5865f2] hover:bg-[#4752c4] text-white text-sm font-medium py-2 rounded-md transition-colors"
              >
                <MessageSquare size={16} />
                Message
              </button>
            </div>

            {/* Member Since */}
            {memberSince && (
              <div className="px-4 pb-3 shrink-0">
                <div className="bg-[#111214] rounded-lg p-3">
                  <h3 className="text-xs font-bold text-[#b5bac1] uppercase tracking-wide mb-1">Member Since</h3>
                  <p className="text-sm text-white">{memberSince}</p>
                </div>
              </div>
            )}

            {/* Note */}
            <div className="px-4 pb-4 shrink-0">
              <div className="bg-[#111214] rounded-lg p-3">
                <h3 className="text-xs font-bold text-[#b5bac1] uppercase tracking-wide mb-1">Note <span className="font-normal">(only visible to you)</span></h3>
                <p className="text-sm text-[#6d6f78] cursor-pointer hover:text-[#b5bac1] transition-colors">Click to add a note</p>
              </div>
            </div>
          </div>

          {/* Right panel */}
          <div className="flex-1 flex flex-col overflow-hidden bg-[#232428]">
            {/* Tabs */}
            <div className="flex border-b border-[#3f4147] px-4 pt-4 shrink-0">
              <button
                onClick={() => setActiveTab('activity')}
                className={`pb-3 mr-4 text-sm font-medium transition-colors border-b-2 ${
                  activeTab === 'activity'
                    ? 'text-white border-white'
                    : 'text-[#b5bac1] border-transparent hover:text-white'
                }`}
              >
                Activity
              </button>
              <button
                onClick={() => setActiveTab('friends')}
                className={`pb-3 mr-4 text-sm font-medium transition-colors border-b-2 ${
                  activeTab === 'friends'
                    ? 'text-white border-white'
                    : 'text-[#b5bac1] border-transparent hover:text-white'
                }`}
              >
                {user.mutualFriends ?? 0} Mutual Friends
              </button>
              <button
                onClick={() => setActiveTab('servers')}
                className={`pb-3 text-sm font-medium transition-colors border-b-2 ${
                  activeTab === 'servers'
                    ? 'text-white border-white'
                    : 'text-[#b5bac1] border-transparent hover:text-white'
                }`}
              >
                {user.mutualServers ?? 0} Mutual Servers
              </button>
            </div>

            {/* Tab content */}
            <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
              {activeTab === 'activity' && (
                <div className="text-[#b5bac1] text-sm text-center mt-8">
                  <p>No activity to show right now.</p>
                </div>
              )}

              {activeTab === 'friends' && (
                <div className="flex flex-col gap-2">
                  {(user.mutualFriendsList?.length ?? 0) === 0 ? (
                    <p className="text-[#b5bac1] text-sm text-center mt-8">No mutual friends.</p>
                  ) : (
                    user.mutualFriendsList!.map(f => (
                      <div key={f.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-white/5 cursor-pointer transition-colors">
                        <div className="relative shrink-0">
                          <div
                            className="w-9 h-9 rounded-full flex items-center justify-center text-white font-bold text-sm"
                            style={{ backgroundColor: avatarColor(f.username) }}
                          >
                            {f.username.charAt(0).toUpperCase()}
                          </div>
                          <div className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-[#232428] ${f.isOnline ? 'bg-[#23a559]' : 'bg-[#80848e]'}`} />
                        </div>
                        <span className="text-white font-medium text-sm">{f.username}</span>
                        <span className="text-xs text-[#b5bac1] ml-auto">{f.isOnline ? 'Online' : 'Offline'}</span>
                      </div>
                    ))
                  )}
                </div>
              )}

              {activeTab === 'servers' && (
                <div className="flex flex-col gap-2">
                  {(user.mutualServersList?.length ?? 0) === 0 ? (
                    <p className="text-[#b5bac1] text-sm text-center mt-8">No mutual servers.</p>
                  ) : (
                    user.mutualServersList!.map(s => (
                      <div key={s.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-white/5 cursor-pointer transition-colors">
                        {s.icon ? (
                          <img src={s.icon} alt={s.name} className="w-10 h-10 rounded-2xl object-cover shrink-0" />
                        ) : (
                          <div className="w-10 h-10 rounded-2xl bg-[#5865f2] flex items-center justify-center text-white text-xs font-bold shrink-0">
                            {getServerInitials(s.name)}
                          </div>
                        )}
                        <span className="text-white font-medium text-sm">{s.name}</span>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
