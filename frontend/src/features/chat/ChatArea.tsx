import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import { Hash, PlusCircle, Send, Users, Edit2, Trash2, X, File, Loader2, SmilePlus, Smile } from 'lucide-react';
import { useSocket } from '../socket/SocketContext';
import { useAuth } from '../auth/AuthContext';
import { MembersSidebar } from '../servers/MembersSidebar';
import { AttachmentRenderer } from '../../components/messages/AttachmentRenderer';
import { EmojiPickerPopup } from '../../components/messages/EmojiPickerPopup';
import { ReactionBadge } from '../../components/messages/ReactionBadge';
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
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [reactionPickerMessageId, setReactionPickerMessageId] = useState<string | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { socket } = useSocket();
  const { user } = useAuth();
  let typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const scrollToBottom = () => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'auto' });
    }, 100);
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, typingUsers, pendingFiles]);

  useEffect(() => {
    const fetchMessagesAndChannel = async () => {
      if (!channelId || !serverId) return;
      try {
        const token = localStorage.getItem('token');
        
        // Fetch messages — FastAPI returns array directly
        const messagesRes = await axios.get(`${API_BASE_URL}/api/messages/${channelId}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setMessages(Array.isArray(messagesRes.data) ? messagesRes.data : []);

        // Fetch channel name — FastAPI returns array directly; each channel has `id`
        const channelsRes = await axios.get(`${API_BASE_URL}/api/channels/${serverId}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const channelList = Array.isArray(channelsRes.data) ? channelsRes.data : [];
        const currentChannel = channelList.find((c: any) => c.id === channelId);
        if (currentChannel) setChannel(currentChannel);
      } catch (err) {
        console.error('Failed to fetch chat data', err);
      }
    };

    fetchMessagesAndChannel();

    if (socket && channelId) {
      socket.emit('join-channel', channelId);

      const handleReceiveMessage = (newMessage: any) => {
        if (newMessage.channelId === channelId) {
          setMessages(prev => {
            // Replace matching optimistic message (same sender + content + recent) or append
            const tempIdx = prev.findIndex(
              m => m._optimistic && m.sender?.id === newMessage.sender?.id && m.content === newMessage.content
            );
            if (tempIdx !== -1) {
              const next = [...prev];
              next[tempIdx] = newMessage;
              return next;
            }
            return [...prev, newMessage];
          });
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
          setMessages((prev) => prev.map((m) => (m.id === updatedMessage.id ? updatedMessage : m)));
        }
      };

      const handleMessageDeleted = (deletedMessage: any) => {
        if (deletedMessage.channelId === channelId) {
          setMessages((prev) => prev.filter((m) => m.id !== deletedMessage.id));
        }
      };

      const handleReactionUpdated = (payload: any) => {
        if (payload.channelId === channelId) {
          setMessages(prev => prev.map(m => m.id === payload.messageId ? { ...m, reactions: payload.reactions } : m));
        }
      };

      // Backend emits 'new-message' for channel messages
      socket.on('new-message', handleReceiveMessage);
      socket.on('user-typing', handleUserTyping);
      socket.on('user-stop-typing', handleUserStopTyping);
      socket.on('message-updated', handleMessageUpdated);
      socket.on('message-deleted', handleMessageDeleted);
      socket.on('reaction_updated', handleReactionUpdated);

      return () => {
        socket.off('new-message', handleReceiveMessage);
        socket.off('user-typing', handleUserTyping);
        socket.off('user-stop-typing', handleUserStopTyping);
        socket.off('message-updated', handleMessageUpdated);
        socket.off('message-deleted', handleMessageDeleted);
        socket.off('reaction_updated', handleReactionUpdated);
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
    setMessages((prev) => prev.filter((m) => m.id !== messageId));

    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${API_BASE_URL}/api/messages/${messageId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
    } catch (err) {
      console.error('Failed to delete message', err);
    }
  };

  const toggleReaction = (messageId: string, emoji: string, currentReactions: any[] = []) => {
    if (!socket || !user) return;
    const reaction = currentReactions.find(r => r.emoji === emoji);
    const hasReacted = reaction?.users.includes(user.id);
    
    if (hasReacted) {
      socket.emit('remove_reaction', { messageId, emoji, type: 'channel' });
    } else {
      socket.emit('add_reaction', { messageId, emoji, type: 'channel' });
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!message.trim() && pendingFiles.length === 0) || !socket || !channelId || !user || isUploading) return;

    setIsUploading(true);
    let uploadedAttachments: any[] = [];

    if (pendingFiles.length > 0) {
      try {
        const formData = new FormData();
        pendingFiles.forEach(file => formData.append('attachments', file));
        
        const token = localStorage.getItem('token');
        const res = await axios.post(`${API_BASE_URL}/api/upload`, formData, {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'multipart/form-data'
          }
        });
        // FastAPI returns array directly
        uploadedAttachments = Array.isArray(res.data) ? res.data : [];
      } catch (err: any) {
        console.error('Failed to upload files', err);
        alert(err.response?.data?.message || 'Failed to upload files. Please try again.');
        setIsUploading(false);
        return;
      }
    }

    const tempId = `temp-${Date.now()}`;
    const optimisticMsg = {
      id: tempId,
      channelId,
      serverId,
      sender: { id: user.id, username: user.username, email: user.email, isOnline: true },
      content: message,
      attachments: uploadedAttachments,
      reactions: [],
      isEdited: false,
      deleted: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      _optimistic: true,
    };
    setMessages(prev => [...prev, optimisticMsg]);
    setMessage('');
    setPendingFiles([]);
    setIsUploading(false);

    socket.emit('new-message', {
      channelId,
      serverId,
      content: message,
      attachments: uploadedAttachments,
    });

    socket.emit('stop-typing', { channelId, username: user.username });
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setPendingFiles(Array.from(e.target.files));
    }
  };

  const removePendingFile = (index: number) => {
    setPendingFiles(prev => prev.filter((_, i) => i !== index));
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
          <div className="text-left text-text-muted mt-8 mb-4">
            <div className="w-16 h-16 bg-server-bg rounded-full flex items-center justify-center mb-4">
              <Hash size={32} className="text-white" />
            </div>
            <h1 className="text-3xl font-bold text-white mb-2">Welcome to {channel ? `#${channel.name}` : 'the channel'}!</h1>
            <p>This is the start of the #{channel ? channel.name : 'channel'} conversation.</p>
          </div>

          <div className="flex flex-col space-y-4">
            {messages.map((msg, idx) => {
              // FastAPI returns msg.sender (not msg.senderId)
              const prevSenderId = idx > 0 ? messages[idx - 1].sender?.id : null;
              const isSameSenderAsPrev = prevSenderId === msg.sender?.id;

              return (
                <div key={msg.id} className={`flex items-start ${isSameSenderAsPrev ? 'mt-1' : 'mt-4'} hover:bg-white/5 -mx-4 px-4 py-0.5 group`}>
                  {!isSameSenderAsPrev ? (
                    <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-white font-bold mr-4 shrink-0 mt-0.5">
                      {msg.sender?.username?.charAt(0).toUpperCase()}
                    </div>
                  ) : (
                    <div className="w-10 mr-4 shrink-0 text-xs text-text-muted opacity-0 group-hover:opacity-100 text-center leading-5">
                      {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  )}

                  <div className="flex flex-col flex-1 min-w-0 relative">
                    {!isSameSenderAsPrev && (
                      <div className="flex items-baseline">
                        <span className="font-medium text-white mr-2 hover:underline cursor-pointer">{msg.sender?.username}</span>
                        <span className="text-xs text-text-muted">
                          {new Date(msg.createdAt).toLocaleDateString()} {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    )}
                    
                    {editingMessageId === msg.id ? (
                      <form onSubmit={(e) => handleEditSubmit(e, msg.id)} className="mt-1 flex flex-col">
                        <input
                          autoFocus
                          type="text"
                          value={editContent}
                          onChange={(e) => setEditContent(e.target.value)}
                          onKeyDown={(e) => { if (e.key === 'Escape') setEditingMessageId(null); }}
                          className="w-full bg-[#383a40] text-text-normal p-2 rounded border border-transparent focus:outline-none focus:border-[#00a8fc]"
                        />
                        <div className="text-xs mt-1">
                          escape to <span className="text-blue-400 cursor-pointer hover:underline" onClick={() => setEditingMessageId(null)}>cancel</span> • enter to <span className="text-blue-400 cursor-pointer hover:underline" onClick={(e) => handleEditSubmit(e as any, msg.id)}>save</span>
                        </div>
                      </form>
                    ) : (
                      <div className="flex flex-col">
                        {msg.content && (
                          <span className={`text-text-normal break-words leading-relaxed ${msg.deleted ? 'text-text-muted italic' : ''}`}>
                            {msg.content}
                            {msg.isEdited && !msg.deleted && <span className="text-[10px] text-text-muted ml-1">(edited)</span>}
                          </span>
                        )}
                        {!msg.deleted && msg.attachments && msg.attachments.length > 0 && (
                          <AttachmentRenderer attachments={msg.attachments} />
                        )}
                      </div>
                    )}
                    
                    {/* Hover Actions Toolbar */}
                    {!msg.deleted && editingMessageId !== msg.id && (
                      <div className="absolute right-0 -top-4 opacity-0 group-hover:opacity-100 bg-[#313338] border border-divider shadow-sm rounded flex items-center overflow-hidden transition-opacity">
                        <button
                          className="p-1.5 text-text-muted hover:text-white hover:bg-white/10 transition-colors relative"
                          onClick={() => setReactionPickerMessageId(reactionPickerMessageId === msg.id ? null : msg.id)}
                          title="Add Reaction"
                        >
                          <SmilePlus size={16} />
                        </button>
                        {user?.id === msg.sender?.id && (
                          <>
                            <button
                              className="p-1.5 text-text-muted hover:text-white hover:bg-white/10 transition-colors"
                              onClick={() => { setEditingMessageId(msg.id); setEditContent(msg.content); }}
                              title="Edit"
                            >
                              <Edit2 size={16} />
                            </button>
                            <button
                              className="p-1.5 text-red-500 hover:text-red-400 hover:bg-white/10 transition-colors"
                              onClick={() => handleDeleteMessage(msg.id)}
                              title="Delete"
                            >
                              <Trash2 size={16} />
                            </button>
                          </>
                        )}
                      </div>
                    )}

                    {reactionPickerMessageId === msg.id && (
                      <EmojiPickerPopup
                        position="top-right"
                        onClose={() => setReactionPickerMessageId(null)}
                        onEmojiSelect={(emoji) => {
                          socket?.emit('add_reaction', { messageId: msg.id, emoji: emoji.emoji, type: 'channel' });
                        }}
                      />
                    )}

                    {/* Reactions */}
                    {msg.reactions && msg.reactions.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {msg.reactions.map((r: any) => (
                          <ReactionBadge
                            key={r.emoji}
                            emoji={r.emoji}
                            count={r.users.length}
                            hasReacted={r.users.includes(user?.id)}
                            users={r.users} // Ideally we map userIds to usernames here if possible, for now just IDs
                            onClick={() => toggleReaction(msg.id, r.emoji, msg.reactions)}
                          />
                        ))}
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

        {/* Message Input */}
        <div className="px-4 pb-6 pt-2 shrink-0 relative flex flex-col">
          {pendingFiles.length > 0 && (
            <div className="bg-[#2b2d31] rounded-t-lg p-4 flex gap-4 overflow-x-auto border-b border-divider">
              {pendingFiles.map((file, idx) => {
                const isImage = file.type.startsWith('image/');
                return (
                  <div key={idx} className="relative w-40 h-40 bg-[#1e1f22] rounded flex flex-col items-center justify-center p-2 group shrink-0">
                    <button 
                      onClick={() => removePendingFile(idx)}
                      className="absolute -top-2 -right-2 bg-[#f23f42] text-white rounded-full p-1 shadow hover:bg-red-600 z-10"
                    >
                      <X size={14} />
                    </button>
                    {isImage ? (
                      <img src={URL.createObjectURL(file)} alt="preview" className="max-h-full max-w-full object-contain rounded" />
                    ) : (
                      <div className="flex flex-col items-center text-text-muted text-center">
                        <File size={32} className="mb-2" />
                        <span className="text-xs truncate w-full px-2">{file.name}</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
          <form onSubmit={handleSendMessage} className={`bg-channel-bg flex items-center px-4 py-2 ${pendingFiles.length > 0 ? 'rounded-b-lg' : 'rounded-lg'}`}>
            <input
              type="file"
              multiple
              className="hidden"
              ref={fileInputRef}
              onChange={(e) => {
                if (e.target.files && e.target.files.length > 0) {
                  setPendingFiles(Array.from(e.target.files));
                }
                e.target.value = '';
              }}
            />
            <button
              type="button"
              tabIndex={-1}
              className="text-interactive-normal hover:text-interactive-hover mr-4 shrink-0"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
            >
              <PlusCircle size={24} />
            </button>
            <input
              type="text"
              value={message}
              onChange={handleTyping}
              disabled={isUploading}
              placeholder={channel ? `Message #${channel.name}` : 'Message'}
              className="flex-1 bg-transparent text-text-normal focus:outline-none py-1.5 disabled:opacity-50"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage(e as any);
                }
              }}
            />
            <button
              type="button"
              className="text-interactive-normal hover:text-interactive-hover ml-4 shrink-0 relative"
              onClick={() => setShowEmojiPicker(!showEmojiPicker)}
            >
              <Smile size={24} />
              {showEmojiPicker && (
                <EmojiPickerPopup
                  position="top-right"
                  onClose={() => setShowEmojiPicker(false)}
                  onEmojiSelect={(emoji) => setMessage(prev => prev + emoji.emoji)}
                />
              )}
            </button>
            <button
              type="submit"
              tabIndex={-1}
              disabled={isUploading || (!message.trim() && pendingFiles.length === 0)}
              className={`${message.trim() || pendingFiles.length > 0 ? 'text-primary' : 'text-interactive-normal'} ml-2 transition-colors disabled:opacity-50 flex items-center`}
            >
              {isUploading ? <Loader2 size={20} className="animate-spin" /> : <Send size={20} />}
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
