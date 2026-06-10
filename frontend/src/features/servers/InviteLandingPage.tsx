import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Hash } from 'lucide-react';
import { useAuth } from '../auth/AuthContext';

export const InviteLandingPage: React.FC = () => {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [inviteData, setInviteData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isJoining, setIsJoining] = useState(false);

  useEffect(() => {
    const fetchInvite = async () => {
      try {
        const res = await axios.get(`http://localhost:5000/api/invites/${code}`);
        if (res.data.success) {
          setInviteData(res.data.data);
        }
      } catch (err: any) {
        if (err.response?.status === 410) {
          setError('This invite link has expired.');
        } else if (err.response?.status === 404) {
          setError('This invite link is invalid or the server no longer exists.');
        } else {
          setError('Failed to load invite details.');
        }
      } finally {
        setIsLoading(false);
      }
    };
    if (code) {
      fetchInvite();
    }
  }, [code]);

  const handleJoin = async () => {
    if (!user) {
      // Preserve invite code and redirect to login
      localStorage.setItem('pendingInvite', code || '');
      navigate('/login');
      return;
    }

    setIsJoining(true);
    setError(null);
    try {
      const token = localStorage.getItem('token');
      const res = await axios.post(`http://localhost:5000/api/invites/${code}/join`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (res.data.success) {
        // Clear pending invite if it exists
        localStorage.removeItem('pendingInvite');
        // Redirect to server
        const serverId = res.data.data._id || res.data.data;
        // In real app we might trigger a refetch of the server list via context, 
        // but navigating to the server will trigger AppLayout/ChannelSidebar to fetch it.
        navigate(`/channels/${serverId}`);
        // Optionally reload to refresh context state (ServerSidebar list)
        window.location.reload(); 
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to join server');
      setIsJoining(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-[#313338]">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-[url('https://images.unsplash.com/photo-1614680376593-902f74a743b1?q=80&w=2574&auto=format&fit=crop')] bg-cover bg-center">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm"></div>
      
      <div className="relative z-10 w-full max-w-[480px] p-8 bg-[#313338] rounded-xl shadow-2xl flex flex-col items-center animate-in fade-in zoom-in-95 duration-300">
        <div className="w-20 h-20 bg-primary rounded-2xl flex items-center justify-center shadow-lg mb-6 transform rotate-3">
          <Hash size={48} className="text-white" />
        </div>
        
        {error ? (
          <div className="text-center w-full">
            <h1 className="text-2xl font-bold text-white mb-2">Invite Invalid</h1>
            <p className="text-text-muted mb-8">{error}</p>
            <button
              onClick={() => navigate('/channels/@me')}
              className="w-full bg-primary hover:bg-primary-hover text-white font-medium py-3 rounded transition-colors shadow-md"
            >
              Continue to App
            </button>
          </div>
        ) : (
          <div className="text-center w-full">
            <p className="text-text-muted font-medium mb-2">
              {inviteData?.inviter ? `${inviteData.inviter} invited you to join` : 'You have been invited to join'}
            </p>
            <h1 className="text-3xl font-extrabold text-white mb-2 truncate">
              {inviteData?.server?.name}
            </h1>
            
            <div className="flex items-center justify-center space-x-4 mb-8 text-sm font-medium">
              <div className="flex items-center text-text-muted">
                <div className="w-2.5 h-2.5 rounded-full bg-[#80848e] mr-1.5"></div>
                {inviteData?.server?.memberCount} {inviteData?.server?.memberCount === 1 ? 'Member' : 'Members'}
              </div>
            </div>

            <button
              onClick={handleJoin}
              disabled={isJoining}
              className="w-full bg-primary hover:bg-primary-hover disabled:opacity-70 disabled:cursor-not-allowed text-white font-medium py-3 rounded transition-colors shadow-md relative overflow-hidden"
            >
              {isJoining ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mx-auto"></div>
              ) : (
                `Accept Invite`
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
