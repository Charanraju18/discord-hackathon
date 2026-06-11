import React, { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import axios from 'axios';
import { useSocket } from '../socket/SocketContext';
import { API_BASE_URL } from '../../config';

export const DirectMessagesSidebar: React.FC = () => {
  const [conversations, setConversations] = useState<any[]>([]);
  const { onlineUsers, socket, presenceOverrides, unreadDMs } = useSocket();

  const fetchConversations = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`${API_BASE_URL}/api/dms`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setConversations(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error('Failed to fetch DMs', err);
    }
  };

  useEffect(() => {
    fetchConversations();
  }, []);

  // Bring conversations with unread messages to the front of the list
  useEffect(() => {
    if (!socket) return;
    const handleNewMessage = (msg: any) => {
      // Move the conversation with a new message to the top
      setConversations(prev => {
        const convId = msg.conversationId;
        const idx = prev.findIndex(c => c.id === convId);
        if (idx === -1) {
          // Unknown conversation — refetch
          fetchConversations();
          return prev;
        }
        const updated = [...prev];
        const [conv] = updated.splice(idx, 1);
        return [conv, ...updated];
      });
    };
    socket.on('new_direct_message', handleNewMessage);
    return () => { socket.off('new_direct_message', handleNewMessage); };
  }, [socket]);

  return (
    <div className="flex flex-col flex-1 overflow-y-auto w-full custom-scrollbar">
      <div className="px-4 py-2">
        <h3 className="text-xs font-bold text-text-muted uppercase tracking-wider mb-2 flex justify-between items-center">
          Direct Messages
        </h3>

        {conversations.length === 0 ? (
          <div className="text-xs text-text-muted italic px-2 py-1">No active DMs</div>
        ) : (
          <div className="space-y-0.5">
            {conversations.map((conv) => {
              const friend = conv.friend;
              if (!friend) return null;

              const isOverride = presenceOverrides[friend.id];
              const isOnline = isOverride !== undefined
                ? isOverride
                : (onlineUsers.includes(friend.id) || friend.isOnline);

              const unread = unreadDMs[conv.id] ?? 0;

              return (
                <NavLink
                  key={conv.id}
                  to={`/channels/@me/${conv.id}`}
                  className={({ isActive }) =>
                    `flex items-center px-2 py-1.5 rounded hover:bg-white/5 hover:text-interactive-hover transition-colors relative ${
                      isActive ? 'bg-white/10 text-interactive-active' : unread > 0 ? 'text-white' : 'text-text-muted'
                    }`
                  }
                >
                  {/* Unread indicator bar on the left edge */}
                  {unread > 0 && (
                    <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-4 bg-white rounded-r" />
                  )}

                  <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-white font-bold mr-3 relative shrink-0">
                    {friend.username.charAt(0).toUpperCase()}
                    <div className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-[#2b2d31] ${isOnline ? 'bg-[#23a559]' : 'bg-[#80848e]'}`} />
                  </div>
                  <div className="flex-1 truncate min-w-0">
                    <span className="font-medium truncate block leading-tight text-sm">{friend.username}</span>
                  </div>

                  {/* Unread count badge */}
                  {unread > 0 && (
                    <div className="ml-1 min-w-4.5 h-4.5 bg-[#f23f42] rounded-full flex items-center justify-center text-[10px] font-bold text-white px-1 shrink-0">
                      {unread > 99 ? '99+' : unread}
                    </div>
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
