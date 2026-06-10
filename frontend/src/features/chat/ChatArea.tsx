import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import { Hash, PlusCircle, Send, Users, Edit2, Trash2, X } from 'lucide-react';
import { useSocket } from '../socket/SocketContext';
import { useAuth } from '../auth/AuthContext';
import { MembersSidebar } from '../servers/MembersSidebar';
import { API_BASE_URL } from '../../config';

export const ChatArea: React.FC = () => {
  const { channelId, serverId } = useParams<{ channelId: string; serverId: string }>();
  const [messages, setMessages] = useState<any[]>([]);
  const [channel, setChannel] = useState<any>(null);
  const [message, setMessage] = useState('');
  const [typingUsers, setTypingUsers] = useState<Set<string>>(new Set());
  const [showMembersMobile, setShowMembersMobile] = useState(false);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { socket } = useSocket();
  const { user } = useAuth();
  let typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, typingUsers]);

  useEffect(() => {
    const fetchMessagesAndChannel = async () => {
      if (!channelId || !serverId) return;
      try {
        const token = localStorage.getItem('token');
        
        // Fetch messages
        const messagesRes = await axios.get(`${API_BASE_URL}/api/messages/${channelId}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (messagesRes.data.success) {
          setMessages(messagesRes.data.data);
        }

        // Fetch channel name by fetching channels for this server
        const channelsRes = await axios.get(`${API_BASE_URL}/api/channels/${serverId}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (channelsRes.data.success) {
          const currentChannel = channelsRes.data.data.find((c: any) => c._id === channelId);
          if (currentChannel) {
            setChannel(currentChannel);
          }
        }
      } catch (err) {
        console.error('Failed to fetch chat data', err);
      }
    };

    fetchMessagesAndChannel();

    if (socket && channelId) {
      socket.emit('join-channel', { channelId });

      const handleReceiveMessage = (newMessage: any) => {
        if (newMessage.channelId === channelId) {
          setMessages((prev) => [...prev, newMessage]);
        }
      };

      const handleUserTyping = ({ channelId: incomingChannelId, username }: any) => {
        if (incomingChannelId === channelId && username !== user?.username) {
          setTypingUsers((prev) => {
            const newSet = new Set(prev);
            newSet.add(username);
            return newSet;
          });
        }
      };

      const handleUserStopTyping = ({ channelId: incomingChannelId, username }: any) => {
        if (incomingChannelId === channelId) {
          setTypingUsers((prev) => {
            const newSet = new Set(prev);
            newSet.delete(username);
            return newSet;
          });
        }
      };

      const handleMessageUpdated = (updatedMessage: any) => {
        if (updatedMessage.channelId === channelId) {
          setMessages((prev) => prev.map((m) => (m._id === updatedMessage._id ? updatedMessage : m)));
        }
      };

      const handleMessageDeleted = (deletedMessage: any) => {
        if (deletedMessage.channelId === channelId) {
          setMessages((prev) => prev.filter((m) => m._id !== deletedMessage._id));
        }
      };

      socket.on('receive-message', handleReceiveMessage);
      socket.on('user-typing', handleUserTyping);
      socket.on('user-stop-typing', handleUserStopTyping);
      socket.on('message-updated', handleMessageUpdated);
      socket.on('message-deleted', handleMessageDeleted);

      return () => {
        socket.off('receive-message', handleReceiveMessage);
        socket.off('user-typing', handleUserTyping);
        socket.off('user-stop-typing', handleUserStopTyping);
        socket.off('message-updated', handleMessageUpdated);
        socket.off('message-deleted', handleMessageDeleted);
      };
    }
  }, [channelId, socket, user?.username]);

  const handleEditSubmit = async (e: React.FormEvent, messageId: string) => {
    e.preventDefault();
    if (!editContent.trim()) return;

    // Optimistic Update
    setMessages((prev) => prev.map((m) => m._id === messageId ? { ...m, content: editContent.trim(), isEdited: true } : m));
    setEditingMessageId(null);
    setEditContent('');

    try {
      const token = localStorage.getItem('token');
      await axios.put(`${API_BASE_URL}/api/messages/${messageId}`, 
        { content: editContent.trim() },
        { headers: { Authorization: `Bearer ${token}` } }
      );
    } catch (err) {
      console.error('Failed to edit message', err);
      // Fallback on error handled by next socket sync or refresh
    }
  };

  const handleDeleteMessage = async (messageId: string) => {
    if (!window.confirm('Delete Message?\n\nThis action cannot be undone.')) return;

    // Optimistic Update: completely remove it from the chat feed
    setMessages((prev) => prev.filter((m) => m._id !== messageId));

    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${API_BASE_URL}/api/messages/${messageId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
    } catch (err) {
      console.error('Failed to delete message', err);
    }
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || !socket || !channelId || !user) return;

    socket.emit('send-message', {
      channelId,
      content: message,
      senderId: user._id,
      username: user.username,
    });
    
    socket.emit('stop-typing', { channelId, username: user.username });
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);

    setMessage('');
  };

  const handleTyping = (e: React.ChangeEvent<HTMLInputElement>) => {
    setMessage(e.target.value);
    
    if (socket && channelId && user) {
      socket.emit('typing', { channelId, username: user.username });
      
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      
      typingTimeoutRef.current = setTimeout(() => {
        socket.emit('stop-typing', { channelId, username: user.username });
      }, 2000);
    }
  };

  return (
    <div className="flex-1 flex min-w-0 h-full">
      <div className="flex-1 flex flex-col bg-background h-full min-w-0 relative">
        {/* Chat Header */}
        <div className="h-12 border-b border-divider flex items-center justify-between px-4 shrink-0 shadow-sm">
          <div className="flex items-center">
            <Hash size={24} className="text-text-muted mr-2" />
            <h3 className="font-bold text-white truncate">{channel ? channel.name : 'channel'}</h3>
          </div>
          <div className="flex items-center">
            {/* Members Toggle Button for Mobile and Desktop */}
            <button 
              className="text-text-muted hover:text-white transition-colors p-1"
              onClick={() => setShowMembersMobile(true)}
            >
              <Users size={24} />
            </button>
          </div>
        </div>

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto px-4 pt-4 pb-2 custom-scrollbar flex flex-col">
          <div className="mt-auto flex flex-col justify-end min-h-full">
            <div className="text-left text-text-muted mt-8 mb-4">
              <div className="w-16 h-16 bg-server-bg rounded-full flex items-center justify-center mb-4">
                <Hash size={32} className="text-white" />
              </div>
              <h1 className="text-3xl font-bold text-white mb-2">Welcome to {channel ? `#${channel.name}` : 'the channel'}!</h1>
              <p>This is the start of the #{channel ? channel.name : 'channel'} conversation.</p>
            </div>

            <div className="flex flex-col space-y-4">
              {messages.map((msg, idx) => {
                const isSameSenderAsPrev = idx > 0 && messages[idx - 1].senderId?._id === msg.senderId?._id;
                
                return (
                  <div key={msg._id} className={`flex items-start ${isSameSenderAsPrev ? 'mt-1' : 'mt-4'} hover:bg-white/5 -mx-4 px-4 py-0.5 group`}>
                    {!isSameSenderAsPrev ? (
                      <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-white font-bold mr-4 shrink-0 mt-0.5">
                        {msg.senderId?.username?.charAt(0).toUpperCase()}
                      </div>
                    ) : (
                      <div className="w-10 mr-4 shrink-0 text-xs text-text-muted opacity-0 group-hover:opacity-100 text-center leading-5">
                        {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    )}
                    
                    <div className="flex flex-col flex-1 min-w-0 relative">
                      {!isSameSenderAsPrev && (
                        <div className="flex items-baseline">
                          <span className="font-medium text-white mr-2 hover:underline cursor-pointer">{msg.senderId?.username}</span>
                          <span className="text-xs text-text-muted">
                            {new Date(msg.createdAt).toLocaleDateString()} {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      )}
                      
                      {editingMessageId === msg._id ? (
                        <form onSubmit={(e) => handleEditSubmit(e, msg._id)} className="mt-1 flex flex-col">
                          <input
                            autoFocus
                            type="text"
                            value={editContent}
                            onChange={(e) => setEditContent(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Escape') setEditingMessageId(null);
                            }}
                            className="w-full bg-[#383a40] text-text-normal p-2 rounded border border-transparent focus:outline-none focus:border-[#00a8fc]"
                          />
                          <div className="text-xs mt-1">
                            escape to <span className="text-blue-400 cursor-pointer hover:underline" onClick={() => setEditingMessageId(null)}>cancel</span> • enter to <span className="text-blue-400 cursor-pointer hover:underline" onClick={(e) => handleEditSubmit(e as any, msg._id)}>save</span>
                          </div>
                        </form>
                      ) : (
                        <span className={`text-text-normal break-words leading-relaxed ${msg.deleted ? 'text-text-muted italic' : ''}`}>
                          {msg.content}
                          {msg.isEdited && !msg.deleted && <span className="text-[10px] text-text-muted ml-1">(edited)</span>}
                        </span>
                      )}
                      
                      {/* Hover Actions Toolbar */}
                      {user?._id === msg.senderId?._id && !msg.deleted && editingMessageId !== msg._id && (
                        <div className="absolute right-0 -top-4 opacity-0 group-hover:opacity-100 bg-[#313338] border border-divider shadow-sm rounded flex items-center overflow-hidden transition-opacity">
                          <button 
                            className="p-1.5 text-text-muted hover:text-white hover:bg-white/10 transition-colors"
                            onClick={() => {
                              setEditingMessageId(msg._id);
                              setEditContent(msg.content);
                            }}
                            title="Edit"
                          >
                            <Edit2 size={16} />
                          </button>
                          <button 
                            className="p-1.5 text-red-500 hover:text-red-400 hover:bg-white/10 transition-colors"
                            onClick={() => handleDeleteMessage(msg._id)}
                            title="Delete"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
            
            {typingUsers.size > 0 && (
              <div className="text-xs text-text-muted mt-2 font-medium flex items-center h-4">
                <span className="flex gap-1 mr-2">
                  <span className="w-1.5 h-1.5 bg-text-muted rounded-full animate-bounce"></span>
                  <span className="w-1.5 h-1.5 bg-text-muted rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></span>
                  <span className="w-1.5 h-1.5 bg-text-muted rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></span>
                </span>
                {Array.from(typingUsers).join(', ')} {typingUsers.size === 1 ? 'is' : 'are'} typing...
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Message Input */}
        <div className="px-4 pb-6 pt-2 shrink-0 relative">
          <form onSubmit={handleSendMessage} className="bg-channel-bg rounded-lg flex items-center px-4 py-2">
            <button type="button" className="text-interactive-normal hover:text-interactive-hover mr-4">
              <PlusCircle size={24} />
            </button>
            <input
              type="text"
              value={message}
              onChange={handleTyping}
              placeholder={channel ? `Message #${channel.name}` : `Message`}
              className="flex-1 bg-transparent text-text-normal focus:outline-none py-1.5"
            />
            <button 
              type="submit" 
              className={`${message.trim() ? 'text-primary' : 'text-interactive-normal hover:text-interactive-hover'} ml-2 transition-colors`}
            >
              <Send size={20} />
            </button>
          </form>
        </div>
      </div>
      
      {/* Members Sidebar injected on the right */}
      {serverId && (
        <MembersSidebar 
          serverId={serverId} 
          isOpenMobile={showMembersMobile} 
          onCloseMobile={() => setShowMembersMobile(false)} 
        />
      )}
    </div>
  );
};
