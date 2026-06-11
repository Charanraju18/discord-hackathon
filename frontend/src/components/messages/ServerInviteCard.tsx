import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { getServerInitials } from '../../utils/serverInitials';
import { API_BASE_URL } from '../../config';

interface ServerInviteCardProps {
  inviteCode: string;
}

export const ServerInviteCard: React.FC<ServerInviteCardProps> = ({ inviteCode }) => {
  const [server, setServer] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [joined, setJoined] = useState(false);
  const [joining, setJoining] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchInvite = async () => {
      try {
        const res = await axios.get(`${API_BASE_URL}/api/invites/${inviteCode}`);
        setServer(res.data.server);
      } catch {
        setServer(null);
      } finally {
        setLoading(false);
      }
    };
    fetchInvite();
  }, [inviteCode]);

  const handleJoin = async () => {
    setJoining(true);
    try {
      const token = localStorage.getItem('token');
      const res = await axios.post(
        `${API_BASE_URL}/api/invites/${inviteCode}/join`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setJoined(true);
      if (res.data.serverId) {
        navigate(`/channels/${res.data.serverId}`);
      }
    } catch (err) {
      console.error('Failed to join server', err);
    } finally {
      setJoining(false);
    }
  };

  if (loading) {
    return (
      <div className="mt-2 bg-[#2b2d31] border border-divider rounded-lg p-3 w-64 animate-pulse">
        <div className="h-4 bg-white/10 rounded w-3/4 mb-2" />
        <div className="h-3 bg-white/10 rounded w-1/2" />
      </div>
    );
  }

  if (!server) {
    return (
      <div className="mt-2 bg-[#2b2d31] border border-divider rounded-lg p-3 w-64">
        <p className="text-text-muted text-sm">Invalid or expired invite.</p>
      </div>
    );
  }

  return (
    <div className="mt-2 bg-[#2b2d31] border border-divider rounded-lg overflow-hidden w-72">
      {/* Banner */}
      <div className="h-[60px] bg-gradient-to-r from-[#1e1f22] to-[#313338]" />

      {/* Body */}
      <div className="px-4 pb-4 -mt-7">
        {/* Server Icon */}
        <div className="w-14 h-14 rounded-2xl bg-[#111214] border-4 border-[#2b2d31] flex items-center justify-center mb-2">
          {server.icon ? (
            <img src={server.icon} alt={server.name} className="w-full h-full rounded-2xl object-cover" />
          ) : (
            <span className="text-white font-bold text-lg">{getServerInitials(server.name)}</span>
          )}
        </div>

        <p className="text-[11px] text-text-muted uppercase font-bold tracking-wide mb-0.5">
          You've been invited to join a server!
        </p>
        <h3 className="text-white font-bold text-base mb-1 truncate">{server.name}</h3>

        <div className="flex items-center gap-3 mb-3 text-xs text-text-muted">
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 bg-[#23a559] rounded-full inline-block" />
            {server.onlineCount ?? 0} Online
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 bg-[#80848e] rounded-full inline-block" />
            {server.memberCount ?? 0} Members
          </span>
        </div>

        <button
          onClick={handleJoin}
          disabled={joined || joining}
          className={`w-full py-1.5 rounded text-sm font-semibold transition-colors ${
            joined
              ? 'bg-[#23a559]/20 text-[#23a559] cursor-default'
              : 'bg-[#23a559] hover:bg-[#1a9147] text-white disabled:opacity-60'
          }`}
        >
          {joined ? 'Joined!' : joining ? 'Joining...' : 'Join Server'}
        </button>
      </div>
    </div>
  );
};

// Extract invite code from a message URL like http://host/invite/CODE
export function extractInviteCode(content: string): string | null {
  const match = content.match(/\/invite\/([A-Za-z0-9]+)/);
  return match ? match[1] : null;
}
