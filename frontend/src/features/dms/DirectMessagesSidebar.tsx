import React, { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import axios from 'axios';
import { useSocket } from '../socket/SocketContext';
import { API_BASE_URL } from '../../config';

export const DirectMessagesSidebar: React.FC = () => {
  const [conversations, setConversations] = useState<any[]>([]);
  const { onlineUsers, socket } = useSocket();

  const fetchConversations = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`${API_BASE_URL}/api/dms`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.data.success) {
        setConversations(res.data.data);
      }
    } catch (err) {
      console.error('Failed to fetch DMs', err);
    }
  };

  useEffect(() => {
    fetchConversations();
  }, []);

  useEffect(() => {
    if (!socket) return;
    const handleNewMessage = () => fetchConversations();
    // Re-fetch on any generic notification to keep unread badges updated.
    socket.on('notification-created', handleNewMessage);
    return () => {
      socket.off('notification-created', handleNewMessage);
    };
  }, [socket]);

  return (
    <div className="flex flex-col h-full w-full">
      <div className="px-4 py-2 mt-2">
        <h3 className="text-xs font-bold text-text-muted uppercase tracking-wider mb-2 flex justify-between items-center group">
          Direct Messages
        </h3>
        
        {conversations.length === 0 ? (
          <div className="text-xs text-text-muted italic px-2 py-1">No active DMs</div>
        ) : (
          <div className="space-y-[2px]">
            {conversations.map((conv) => {
              const friend = conv.friend;
              if (!friend) return null;
              const isOnline = onlineUsers.includes(friend._id);

              return (
                <NavLink
                  key={conv._id}
                  to={`/channels/@me/${conv._id}`}
                  className={({ isActive }) => 
                    `flex items-center px-2 py-1.5 rounded text-text-muted hover:bg-white/5 hover:text-interactive-hover transition-colors ${isActive ? 'bg-white/10 text-interactive-active' : ''}`
                  }
                >
                  <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-white font-bold mr-3 relative shrink-0">
                    {friend.username.charAt(0).toUpperCase()}
                    <div className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-[#2b2d31] ${isOnline ? 'bg-[#23a559]' : 'bg-[#80848e]'}`} />
                  </div>
                  <div className="flex-1 truncate">
                    <span className="font-medium truncate block leading-tight">{friend.username}</span>
                  </div>
                  {conv.unread && (
                    <div className="w-2 h-2 bg-[#f23f42] rounded-full shrink-0 ml-2" />
                  )}
                </NavLink>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
