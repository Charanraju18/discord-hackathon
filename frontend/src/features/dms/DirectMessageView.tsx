import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import { AtSign, PlusCircle, Send, Edit2, Trash2, File, X, Loader2, Smile, SmilePlus } from 'lucide-react';
import { useSocket } from '../socket/SocketContext';
import { useAuth } from '../auth/AuthContext';
import { AttachmentRenderer } from '../../components/messages/AttachmentRenderer';
import { EmojiPickerPopup } from '../../components/messages/EmojiPickerPopup';
import { ReactionBadge } from '../../components/messages/ReactionBadge';
import { ServerInviteCard, extractInviteCode } from '../../components/messages/ServerInviteCard';
import { DMProfilePanel } from './DMProfilePanel';
import { API_BASE_URL } from '../../config';

export const DirectMessageView: React.FC = () => {
  const { conversationId } = useParams<{ conversationId: string }>();
  const [messages, setMessages] = useState<any[]>([]);
  const [conversation, setConversation] = useState<any>(null);
  const [message, setMessage] = useState('');
  const [typingUsers, setTypingUsers] = useState<Set<string>>(new Set());
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [reactionPickerMessageId, setReactionPickerMessageId] = useState<string | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { socket, onlineUsers, presenceOverrides, markDMRead, setActiveDMConversation } = useSocket();
  const { user } = useAuth();
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const scrollToBottom = () => {
    setTimeout(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'auto' }); }, 100);
  };

  useEffect(() => { scrollToBottom(); }, [messages, typingUsers, pendingFiles]);

  // Mark this conversation as read when opened; clear on leave
  useEffect(() => {
    if (!conversationId) return;
    setActiveDMConversation(conversationId);
    return () => { setActiveDMConversation(null); };
  }, [conversationId]);

  useEffect(() => {
    const fetchData = async () => {
      if (!conversationId) return;
      setLoading(true);
      try {
        const token = localStorage.getItem('token');
        const headers = { Authorization: `Bearer ${token}` };

        // Fetch conversation and messages in parallel
        const [convRes, msgsRes] = await Promise.all([
          axios.get(`${API_BASE_URL}/api/dms/${conversationId}`, { headers }),
          axios.get(`${API_BASE_URL}/api/dms/${conversationId}/messages`, { headers }),
        ]);

        if (convRes.data?.id) setConversation(convRes.data);
        setMessages(Array.isArray(msgsRes.data) ? msgsRes.data : []);
      } catch (err) {
        console.error('Failed to fetch DM data', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();

    if (socket && conversationId) {
      const joinConv = () => socket.emit('dm:join-conversation', { conversationId });
      joinConv();
      socket.on('connect', joinConv);

      const handleReceiveMessage = (msg: any) => {
        if (msg.conversationId === conversationId) {
          setMessages(prev => {
            // Replace matching optimistic message or append
            const tempIdx = prev.findIndex(
              m => m._optimistic && m.sender?.id === msg.sender?.id && m.content === msg.content
            );
            if (tempIdx !== -1) {
              const next = [...prev];
              next[tempIdx] = msg;
              return next;
            }
            return [...prev, msg];
          });
        }
      };
      const handleUserTyping = ({ conversationId: cid, username }: any) => {
        if (cid === conversationId && username !== user?.username) {
          setTypingUsers(prev => new Set([...prev, username]));
        }
      };
      const handleUserStopTyping = ({ conversationId: cid, username }: any) => {
        if (cid === conversationId) {
          setTypingUsers(prev => { const s = new Set(prev); s.delete(username); return s; });
        }
      };
      // Backend emits `update_direct_message` and `delete_direct_message`
      const handleMessageUpdated = (updated: any) => {
        if (updated.conversationId === conversationId) {
          setMessages(prev => prev.map(m => m.id === updated.id ? { ...m, ...updated } : m));
        }
      };
      const handleMessageDeleted = ({ id }: any) => {
        setMessages(prev => prev.filter(m => m.id !== id));
      };

      const handleReactionUpdated = (payload: any) => {
        if (payload.channelId === conversationId) { // The backend payload uses channelId for DMs too due to shared code logic, actually wait, check what backend sends for channelId in DMs. The backend sends conversationId as channelId if type is dm. So payload.channelId is conversationId.
          setMessages(prev => prev.map(m => m.id === payload.messageId ? { ...m, reactions: payload.reactions } : m));
        }
      };

      socket.on('new_direct_message', handleReceiveMessage);
      socket.on('dm:typing', handleUserTyping);
      socket.on('dm:stop-typing', handleUserStopTyping);
      socket.on('update_direct_message', handleMessageUpdated);
      socket.on('delete_direct_message', handleMessageDeleted);
      socket.on('reaction_updated', handleReactionUpdated);

      return () => {
        socket.off('connect', joinConv);
        socket.off('new_direct_message', handleReceiveMessage);
        socket.off('dm:typing', handleUserTyping);
        socket.off('dm:stop-typing', handleUserStopTyping);
        socket.off('update_direct_message', handleMessageUpdated);
        socket.off('delete_direct_message', handleMessageDeleted);
        socket.off('reaction_updated', handleReactionUpdated);
      };
    }
  }, [conversationId, socket, user?.username]);

  const handleEditSubmit = async (e: React.FormEvent, messageId: string) => {
    e.preventDefault();
    if (!editContent.trim()) return;
    setMessages(prev => prev.map(m => m.id === messageId ? { ...m, content: editContent.trim(), isEdited: true } : m));
    setEditingMessageId(null);
    setEditContent('');
    try {
      const token = localStorage.getItem('token');
      await axios.patch(`${API_BASE_URL}/api/dms/messages/${messageId}`,
        { content: editContent.trim() },
        { headers: { Authorization: `Bearer ${token}` } }
      );
    } catch (err) { console.error('Failed to edit message', err); }
  };

  const handleDeleteMessage = async (messageId: string) => {
    if (!window.confirm('Delete Message?\n\nThis action cannot be undone.')) return;
    setMessages(prev => prev.filter(m => m.id !== messageId));
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${API_BASE_URL}/api/dms/messages/${messageId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
    } catch (err) { console.error('Failed to delete message', err); }
  };

  const toggleReaction = (messageId: string, emoji: string, currentReactions: any[] = []) => {
    if (!socket || !user) return;
    const reaction = currentReactions.find(r => r.emoji === emoji);
    const hasReacted = reaction?.users?.some((u: any) => (typeof u === 'string' ? u : u.id) === user?.id);
    
    if (hasReacted) {
      socket.emit('remove_reaction', { messageId, emoji, type: 'dm' });
    } else {
      socket.emit('add_reaction', { messageId, emoji, type: 'dm' });
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!message.trim() && pendingFiles.length === 0) || !conversationId || !user || isUploading) return;

    setIsUploading(true);
    let uploadedAttachments: any[] = [];

    if (pendingFiles.length > 0) {
      try {
        const formData = new FormData();
        pendingFiles.forEach(file => formData.append('attachments', file));
        const token = localStorage.getItem('token');
        const res = await axios.post(`${API_BASE_URL}/api/upload`, formData, {
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'multipart/form-data' }
        });
        if (res.data) uploadedAttachments = Array.isArray(res.data) ? res.data : res.data.files || [];
      } catch (err: any) {
        console.error('Failed to upload files', err);
        alert(err.response?.data?.detail || 'Failed to upload files.');
        setIsUploading(false);
        return;
      }
    }

    const currentMessage = message;
    setMessage('');
    setPendingFiles([]);
    socket?.emit('dm:stop-typing', { conversationId, username: user.username });
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);

    // Optimistic update — message appears instantly
    const tempId = `temp-${Date.now()}`;
    const optimisticMsg = {
      id: tempId,
      conversationId,
      sender: { id: user.id, username: user.username, email: user.email, isOnline: true },
      content: currentMessage,
      attachments: uploadedAttachments,
      reactions: [],
      isEdited: false,
      deleted: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      _optimistic: true,
    };
    setMessages(prev => [...prev, optimisticMsg]);

    try {
      const token = localStorage.getItem('token');
      await axios.post(`${API_BASE_URL}/api/dms/${conversationId}/messages`,
        { content: currentMessage, attachments: uploadedAttachments },
        { headers: { Authorization: `Bearer ${token}` } }
      );
    } catch (err) {
      // Remove optimistic message on failure
      setMessages(prev => prev.filter(m => m.id !== tempId));
      console.error('Failed to send message', err);
    }

    setIsUploading(false);
  };

  const handleTyping = (e: React.ChangeEvent<HTMLInputElement>) => {
    setMessage(e.target.value);
    if (socket && conversationId && user) {
      socket.emit('dm:typing', { conversationId, username: user.username });
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => {
        socket.emit('dm:stop-typing', { conversationId, username: user.username });
      }, 2000);
    }
  };

  if (loading) return <div className="flex-1 bg-background flex items-center justify-center text-text-muted">Loading...</div>;
  if (!conversation) return <div className="flex-1 bg-background flex items-center justify-center text-text-muted">Conversation not found.</div>;

  const friend = conversation.friend;
  const isOverride = presenceOverrides[friend?.id];
  const isOnline = isOverride !== undefined ? isOverride : (onlineUsers.includes(friend?.id) || friend?.isOnline);

  return (
    <div className="flex-1 flex h-full min-w-0">
    <div className="flex-1 flex flex-col bg-background h-full min-w-0 relative overflow-hidden">
      {/* Header */}
      <div className="h-12 border-b border-divider flex items-center px-4 shrink-0 shadow-sm">
        <AtSign size={24} className="text-text-muted mr-2" />
        <div className="flex flex-col justify-center min-w-0">
          <h3 className="font-bold text-white truncate flex items-center">
            {friend?.username}
            <div className={`w-2 h-2 rounded-full ml-2 shrink-0 ${isOnline ? 'bg-[#23a559]' : 'bg-[#80848e]'}`} />
          </h3>
          <span className="text-xs text-text-muted leading-tight">{isOnline ? 'Online' : 'Offline'}</span>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 pt-4 pb-2 custom-scrollbar flex flex-col">
        {messages.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-6 mt-8 mb-4">
            <div className="w-24 h-24 bg-server-bg rounded-full flex items-center justify-center mb-6">
              <span className="text-5xl font-bold text-white opacity-50">{friend?.username?.charAt(0).toUpperCase()}</span>
            </div>
            <h1 className="text-3xl font-bold text-white mb-2">{friend?.username}</h1>
            <p className="text-text-muted">This is the beginning of your direct message history with <strong>{friend?.username}</strong>.</p>
          </div>
        ) : (
          <div className="flex flex-col space-y-4">
            {messages.filter(m => !m.deleted).map((msg, idx, arr) => {
              // msg.sender is { id, username, ... } (from FastAPI)
              const prevSenderId = idx > 0 ? arr[idx - 1].sender?.id : null;
              const isSameSender = prevSenderId === msg.sender?.id;
              const isOwn = user?.id === msg.sender?.id;

              return (
                <div key={msg.id} className={`flex items-start ${isSameSender ? 'mt-1' : 'mt-4'} hover:bg-white/5 -mx-4 px-4 py-0.5 group`}>
                  {!isSameSender ? (
                    <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-white font-bold mr-4 shrink-0 mt-0.5">
                      {msg.sender?.username?.charAt(0).toUpperCase()}
                    </div>
                  ) : (
                    <div className="w-10 mr-4 shrink-0 text-xs text-text-muted opacity-0 group-hover:opacity-100 text-center leading-5">
                      {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  )}

                  <div className="flex flex-col flex-1 min-w-0 relative">
                    {!isSameSender && (
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
                          escape to <span className="text-blue-400 cursor-pointer hover:underline" onClick={() => setEditingMessageId(null)}>cancel</span>
                          {' '}• enter to <span className="text-blue-400 cursor-pointer hover:underline" onClick={(e) => handleEditSubmit(e as any, msg.id)}>save</span>
                        </div>
                      </form>
                    ) : (
                      <div className="flex flex-col">
                        {msg.content && !msg.deleted && extractInviteCode(msg.content) ? (
                          <ServerInviteCard inviteCode={extractInviteCode(msg.content)!} />
                        ) : msg.content ? (
                          <span className={`text-text-normal wrap-break-word leading-relaxed ${msg.deleted ? 'text-text-muted italic' : ''}`}>
                            {msg.content}
                            {msg.isEdited && !msg.deleted && <span className="text-[10px] text-text-muted ml-1">(edited)</span>}
                          </span>
                        ) : null}
                        {!msg.deleted && msg.attachments?.length > 0 && (
                          <AttachmentRenderer attachments={msg.attachments} />
                        )}
                      </div>
                    )}

                    {/* Hover Actions Toolbar */}
                    {!msg.deleted && editingMessageId !== msg.id && (
                      <div className={`absolute right-0 -top-4 ${reactionPickerMessageId === msg.id ? 'opacity-100 z-50' : 'opacity-0 group-hover:opacity-100'} bg-background border border-divider shadow-sm rounded flex items-center transition-opacity`}>
                        <button
                          className="p-1.5 text-text-muted hover:text-white hover:bg-white/10 transition-colors relative"
                          onClick={() => setReactionPickerMessageId(reactionPickerMessageId === msg.id ? null : msg.id)}
                          title="Add Reaction"
                        >
                          <SmilePlus size={16} />
                          {reactionPickerMessageId === msg.id && (
                            <EmojiPickerPopup
                              position="top-right"
                              onClose={() => setReactionPickerMessageId(null)}
                              onEmojiSelect={(emoji) => {
                                socket?.emit('add_reaction', { messageId: msg.id, emoji: emoji.emoji, type: 'dm' });
                              }}
                            />
                          )}
                        </button>
                        {isOwn && (
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

                    {/* Reactions */}
                    {msg.reactions && msg.reactions.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {msg.reactions.map((r: any) => (
                          <ReactionBadge
                            key={r.emoji}
                            emoji={r.emoji}
                            count={r.users.length}
                            hasReacted={r.users.some((u: any) => (typeof u === 'string' ? u : u.id) === user?.id)}
                            users={r.users}
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
        )}

        {typingUsers.size > 0 && (
          <div className="text-xs text-text-muted mt-2 font-medium flex items-center h-4">
            <span className="flex gap-1 mr-2">
              <span className="w-1.5 h-1.5 bg-text-muted rounded-full animate-bounce" />
              <span className="w-1.5 h-1.5 bg-text-muted rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
              <span className="w-1.5 h-1.5 bg-text-muted rounded-full animate-bounce" style={{ animationDelay: '0.4s' }} />
            </span>
            {Array.from(typingUsers).join(', ')} {typingUsers.size === 1 ? 'is' : 'are'} typing...
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="px-4 pb-6 pt-2 shrink-0 relative flex flex-col">
        {pendingFiles.length > 0 && (
          <div className="bg-channel-bg rounded-t-lg p-4 flex gap-4 overflow-x-auto border-b border-divider">
            {pendingFiles.map((file, idx) => {
              const isImage = file.type.startsWith('image/');
              return (
                <div key={idx} className="relative w-40 h-40 bg-server-bg rounded flex flex-col items-center justify-center p-2 group shrink-0">
                  <button onClick={() => setPendingFiles(prev => prev.filter((_, i) => i !== idx))} className="absolute -top-2 -right-2 bg-[#f23f42] text-white rounded-full p-1 shadow hover:bg-red-600 z-10">
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
              // Reset so same file can be re-selected; don't clear pendingFiles on cancel
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
            placeholder={friend ? `Message @${friend.username}` : 'Message'}
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
    {friend && <DMProfilePanel friend={friend} />}
    </div>
  );
};
