import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { ChevronRight } from 'lucide-react';
import { API_BASE_URL } from '../../config';
import { useSocket } from '../socket/SocketContext';
import { UserProfileModal } from '../../components/modals/UserProfileModal';

interface DMProfilePanelProps {
  friend: {
    id: string;
    username: string;
    isOnline?: boolean;
  };
}

export const DMProfilePanel: React.FC<DMProfilePanelProps> = ({ friend }) => {
  const [profile, setProfile] = useState<any>(null);
  const [showModal, setShowModal] = useState(false);
  const { onlineUsers, presenceOverrides } = useSocket();

  useEffect(() => {
    if (!friend?.id) return;
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

  const initial = friend.username?.charAt(0).toUpperCase();

  const profileForModal = profile ? {
    ...profile,
    isOnline,
  } : {
    id: friend.id,
    username: friend.username,
    isOnline,
  };

  return (
    <>
      <div className="w-85 shrink-0 bg-server-bg flex-col overflow-y-auto custom-scrollbar border-l border-divider hidden lg:flex">
        {/* Banner */}
        <div className="h-15 bg-linear-to-br from-[#4f545c] to-[#36393f] shrink-0" />

        {/* Avatar row */}
        <div className="px-4 pb-4 -mt-9 relative shrink-0">
          <div className="relative inline-block">
            <div className="w-20 h-20 rounded-full bg-primary border-[6px] border-server-bg flex items-center justify-center text-white text-3xl font-bold">
              {initial}
            </div>
            <div className={`absolute bottom-1 right-1 w-4 h-4 rounded-full border-[3px] border-server-bg ${isOnline ? 'bg-[#23a559]' : 'bg-[#80848e]'}`} />
          </div>
        </div>

        {/* Name + handle */}
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

        {/* Mutual Servers / Mutual Friends */}
        {profile && (
          <div className="px-4 pb-2 shrink-0">
            <div className="bg-[#111214] rounded-lg divide-y divide-divider overflow-hidden">
              <button
                className="w-full flex items-center justify-between px-3 py-3 hover:bg-white/5 cursor-pointer transition-colors"
                onClick={() => setShowModal(true)}
              >
                <span className="text-sm font-medium text-text-normal">
                  Mutual Servers — {profile.mutualServers ?? 0}
                </span>
                <ChevronRight size={16} className="text-text-muted" />
              </button>
              <button
                className="w-full flex items-center justify-between px-3 py-3 hover:bg-white/5 cursor-pointer transition-colors"
                onClick={() => setShowModal(true)}
              >
                <span className="text-sm font-medium text-text-normal">
                  Mutual Friends — {profile.mutualFriends ?? 0}
                </span>
                <ChevronRight size={16} className="text-text-muted" />
              </button>
            </div>
          </div>
        )}

        {/* View Full Profile */}
        <div className="px-4 pb-4 mt-auto shrink-0">
          <button
            className="w-full text-sm text-text-muted hover:text-white transition-colors py-2 text-center"
            onClick={() => setShowModal(true)}
          >
            View Full Profile
          </button>
        </div>
      </div>

      {showModal && (
        <UserProfileModal
          user={profileForModal}
          onClose={() => setShowModal(false)}
        />
      )}
    </>
  );
};
