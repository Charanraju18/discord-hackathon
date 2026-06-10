import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Bell, Check, X } from 'lucide-react';
import { useSocket } from '../socket/SocketContext';
import { useAuth } from '../auth/AuthContext';
import { API_BASE_URL } from '../../config';

interface Invitation {
  _id: string;
  serverId: { _id: string; name: string };
  senderId: { _id: string; username: string };
  status: string;
  createdAt: string;
}

export const NotificationCenter: React.FC = () => {
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const { socket } = useSocket();
  const { user } = useAuth();
  const navigate = useNavigate();
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchInvitations = async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await axios.get(`${API_BASE_URL}/api/invitations`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.data.success) {
          setInvitations(res.data.data);
        }
      } catch (err) {
        console.error('Failed to fetch invitations', err);
      }
    };
    if (user) {
      fetchInvitations();
    }
  }, [user]);

  useEffect(() => {
    if (!socket) return;

    const handleReceive = (invitation: Invitation) => {
      setInvitations((prev) => [invitation, ...prev]);
    };

    socket.on('invitation-received', handleReceive);

    return () => {
      socket.off('invitation-received', handleReceive);
    };
  }, [socket]);

  // Handle clicking outside to close
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleAction = async (id: string, action: 'accept' | 'decline') => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.post(`${API_BASE_URL}/api/invitations/${id}/${action}`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (res.data.success) {
        setInvitations((prev) => prev.filter((inv) => inv._id !== id));
        
        if (action === 'accept') {
          setIsOpen(false);
          const serverId = res.data.data._id || res.data.data;
          // Navigate to new server
          navigate(`/channels/${serverId}`);
          // Trigger a reload to refresh context state (ServerSidebar list, etc.)
          window.location.reload();
        }
      }
    } catch (err) {
      console.error(`Failed to ${action} invitation`, err);
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="relative w-8 h-8 flex items-center justify-center text-text-muted hover:text-text-normal hover:bg-white/10 rounded transition-colors"
      >
        <Bell size={20} />
        {invitations.length > 0 && (
          <div className="absolute top-0 right-0 w-3.5 h-3.5 bg-red-500 rounded-full flex items-center justify-center text-[9px] font-bold text-white border-2 border-[#232428]">
            {invitations.length}
          </div>
        )}
      </button>

      {isOpen && (
        <div className="absolute bottom-full left-0 mb-2 w-80 bg-[#313338] rounded-md shadow-2xl border border-divider overflow-hidden z-50">
          <div className="p-3 border-b border-divider bg-[#2b2d31]">
            <h3 className="font-bold text-white text-sm uppercase tracking-wider">Notifications</h3>
          </div>
          
          <div className="max-h-96 overflow-y-auto custom-scrollbar">
            {invitations.length === 0 ? (
              <div className="p-6 text-center text-text-muted">
                <Bell size={32} className="mx-auto mb-2 opacity-50" />
                <p className="text-sm">No new notifications.</p>
              </div>
            ) : (
              <div className="flex flex-col">
                {invitations.map((inv) => (
                  <div key={inv._id} className="p-3 border-b border-divider/50 hover:bg-white/5 transition-colors">
                    <p className="text-sm text-text-normal mb-2 leading-tight">
                      <span className="font-bold text-white">{inv.senderId?.username}</span> invited you to join <span className="font-bold text-white">{inv.serverId?.name}</span>
                    </p>
                    <p className="text-xs text-text-muted mb-3">
                      {new Date(inv.createdAt).toLocaleString()}
                    </p>
                    <div className="flex space-x-2">
                      <button 
                        onClick={() => handleAction(inv._id, 'accept')}
                        className="flex-1 bg-[#23a559] hover:bg-[#1a7c43] text-white text-xs font-bold py-1.5 rounded flex items-center justify-center transition-colors"
                      >
                        <Check size={14} className="mr-1" /> Accept
                      </button>
                      <button 
                        onClick={() => handleAction(inv._id, 'decline')}
                        className="flex-1 bg-red-500 hover:bg-red-600 text-white text-xs font-bold py-1.5 rounded flex items-center justify-center transition-colors"
                      >
                        <X size={14} className="mr-1" /> Decline
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
