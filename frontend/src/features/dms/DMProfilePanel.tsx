import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { ChevronRight, ChevronDown } from 'lucide-react';
import { API_BASE_URL } from '../../config';
import { useSocket } from '../socket/SocketContext';
import { getServerInitials } from '../../utils/serverInitials';

interface DMProfilePanelProps {
  friend: {
    id: string;
    username: string;
    isOnline?: boolean;
  };
}

const COLORS = ['#5865f2', '#eb459e', '#ed4245', '#3ba55d', '#00b0f4', '#faa61a'];
function avatarColor(name: string) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h);
  return COLORS[Math.abs(h) % COLORS.length];
}

export const DMProfilePanel: React.FC<DMProfilePanelProps> = ({ friend }) => {
  const [profile, setProfile] = useState<any>(null);
  const [serversOpen, setServersOpen] = useState(false);
  const [friendsOpen, setFriendsOpen] = useState(false);
  const { onlineUsers, presenceOverrides } = useSocket();

  useEffect(() => {
    if (!friend?.id) return;
    setServersOpen(false);
    setFriendsOpen(false);
    const fetch = async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await axios.get(`${API_BASE_URL}/api/users/${friend.id}/profile`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setProfile(res.data);
      } catch {
        setProfile(null);
      }
    };
    fetch();
  }, [friend?.id]);

  const isOverride = presenceOverrides[friend.id];
  const isOnline = isOverride !== undefined ? isOverride : (onlineUsers.includes(friend.id) || friend.isOnline);

  const memberSince = profile?.createdAt
    ? new Date(profile.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    : null;

  const color = avatarColor(friend.username);
  const initial = friend.username?.charAt(0).toUpperCase();

  return (
    <div className="w-85 shrink-0 bg-server-bg flex-col overflow-y-auto custom-scrollbar border-l border-divider hidden lg:flex">
      {/* Banner */}
      <div
        className="h-15 shrink-0"
        style={{ background: `linear-gradient(135deg, ${color}99, ${color}44)` }}
      />

      {/* Avatar */}
      <div className="px-4 pb-3 -mt-9 relative shrink-0">
        <div className="relative inline-block">
          <div
            className="w-20 h-20 rounded-full flex items-center justify-center text-white text-3xl font-bold border-[6px] border-server-bg"
            style={{ backgroundColor: color }}
          >
            {initial}
          </div>
          <div className={`absolute bottom-1 right-1 w-4 h-4 rounded-full border-[3px] border-server-bg ${isOnline ? 'bg-[#23a559]' : 'bg-[#80848e]'}`} />
        </div>
      </div>

      {/* Username card */}
      <div className="px-4 pb-3 shrink-0">
        <div className="bg-[#111214] rounded-lg p-3">
          <h2 className="text-xl font-bold text-white leading-tight">{friend.username}</h2>
          <p className="text-sm text-text-muted">{friend.username}</p>
        </div>
      </div>

      {/* Member Since */}
      {memberSince && (
        <div className="px-4 pb-3 shrink-0">
          <div className="bg-[#111214] rounded-lg p-3">
            <h3 className="text-xs font-bold text-text-normal uppercase tracking-wide mb-1">Member Since</h3>
            <p className="text-sm text-text-normal">{memberSince}</p>
          </div>
        </div>
      )}

      {/* Mutual Servers — accordion */}
      {profile && (
        <div className="px-4 pb-2 shrink-0">
          <div className="bg-[#111214] rounded-lg overflow-hidden divide-y divide-divider">
            {/* Mutual Servers row */}
            <button
              className="w-full flex items-center justify-between px-3 py-3 hover:bg-white/5 transition-colors"
              onClick={() => setServersOpen(o => !o)}
            >
              <span className="text-sm font-medium text-text-normal">
                Mutual Servers — {profile.mutualServers ?? 0}
              </span>
              {serversOpen
                ? <ChevronDown size={16} className="text-text-muted shrink-0" />
                : <ChevronRight size={16} className="text-text-muted shrink-0" />
              }
            </button>

            {serversOpen && (
              <div className="px-3 py-2 flex flex-col gap-1">
                {(profile.mutualServersList?.length ?? 0) === 0 ? (
                  <p className="text-xs text-text-muted py-1">No mutual servers.</p>
                ) : (
                  profile.mutualServersList.map((s: any) => (
                    <div key={s.id} className="flex items-center gap-2.5 py-1.5 hover:bg-white/5 rounded px-1 cursor-pointer transition-colors">
                      {s.icon ? (
                        <img src={s.icon} alt={s.name} className="w-8 h-8 rounded-xl object-cover shrink-0" />
                      ) : (
                        <div className="w-8 h-8 rounded-xl bg-primary flex items-center justify-center text-white text-xs font-bold shrink-0">
                          {getServerInitials(s.name)}
                        </div>
                      )}
                      <span className="text-sm text-text-normal truncate">{s.name}</span>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* Mutual Friends row */}
            <button
              className="w-full flex items-center justify-between px-3 py-3 hover:bg-white/5 transition-colors"
              onClick={() => setFriendsOpen(o => !o)}
            >
              <span className="text-sm font-medium text-text-normal">
                Mutual Friends — {profile.mutualFriends ?? 0}
              </span>
              {friendsOpen
                ? <ChevronDown size={16} className="text-text-muted shrink-0" />
                : <ChevronRight size={16} className="text-text-muted shrink-0" />
              }
            </button>

            {friendsOpen && (
              <div className="px-3 py-2 flex flex-col gap-1">
                {(profile.mutualFriendsList?.length ?? 0) === 0 ? (
                  <p className="text-xs text-text-muted py-1">No mutual friends.</p>
                ) : (
                  profile.mutualFriendsList.map((f: any) => (
                    <div key={f.id} className="flex items-center gap-2.5 py-1.5 hover:bg-white/5 rounded px-1 cursor-pointer transition-colors">
                      <div className="relative shrink-0">
                        <div
                          className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold"
                          style={{ backgroundColor: avatarColor(f.username) }}
                        >
                          {f.username.charAt(0).toUpperCase()}
                        </div>
                        <div className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-[#111214] ${f.isOnline ? 'bg-[#23a559]' : 'bg-[#80848e]'}`} />
                      </div>
                      <div className="flex flex-col min-w-0">
                        <span className="text-sm text-text-normal truncate">{f.username}</span>
                        <span className="text-xs text-text-muted">{f.isOnline ? 'Online' : 'Offline'}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* View Full Profile */}
      <div className="px-4 pb-4 mt-auto shrink-0">
        <button className="w-full text-sm text-text-muted hover:text-white transition-colors py-2 text-center">
          View Full Profile
        </button>
      </div>
    </div>
  );
};
