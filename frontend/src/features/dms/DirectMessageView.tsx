import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import { AtSign, PlusCircle, Send, Edit2, Trash2, File, X, Loader2 } from 'lucide-react';
import { useSocket } from '../socket/SocketContext';
import { useAuth } from '../auth/AuthContext';
import { AttachmentRenderer } from '../../components/messages/AttachmentRenderer';
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
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { socket, onlineUsers, presenceOverrides } = useSocket();
  const { user } = useAuth();
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const scrollToBottom = () => {
    setTimeout(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'auto' }); }, 100);
  };

  useEffect(() => { scrollToBottom(); }, [messages, typingUsers, pendingFiles]);

  useEffect(() => {
    const fetchData = async () => {
      if (!conversationId) return;
      setLoading(true);
      try {
        const token = localStorage.getItem('token');

        // GET /api/dms returns array directly; each conv has `id` (not `_id`) and `friend`
        const convRes = await axios.get(`${API_BASE_URL}/api/dms`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const convList = Array.isArray(convRes.data) ? convRes.data : [];
        const currentConv = convList.find((c: any) => c.id === conversationId);
        if (currentConv) setConversation(currentConv);

        // GET /api/dms/:id/messages returns array directly; each msg has `id`, `sender: {...}`
        const msgsRes = await axios.get(`${API_BASE_URL}/api/dms/${conversationId}/messages`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setMessages(Array.isArray(msgsRes.data) ? msgsRes.data : []);
      } catch (err) {
        console.error('Failed to fetch DM data', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();

    if (socket && conversationId) {
      socket.emit('dm:join-conversation', { conversationId });

      const handleReceiveMessage = (msg: any) => {
        if (msg.conversationId === conversationId) {
          setMessages(prev => [...prev, msg]);
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

      socket.on('new_direct_message', handleReceiveMessage);
      socket.on('dm:typing', handleUserTyping);
      socket.on('dm:stop-typing', handleUserStopTyping);
      socket.on('update_direct_message', handleMessageUpdated);
      socket.on('delete_direct_message', handleMessageDeleted);

      return () => {
        socket.off('new_direct_message', handleReceiveMessage);
        socket.off('dm:typing', handleUserTyping);
        socket.off('dm:stop-typing', handleUserStopTyping);
        socket.off('update_direct_message', handleMessageUpdated);
        socket.off('delete_direct_message', handleMessageDeleted);
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
    socket?.emit('dm:stop-typing', { conversationId, username: user.username });
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);

    try {
      const token = localStorage.getItem('token');
      await axios.post(`${API_BASE_URL}/api/dms/${conversationId}/messages`,
        { content: currentMessage, attachments: uploadedAttachments },
        { headers: { Authorization: `Bearer ${token}` } }
      );
    } catch (err) { console.error('Failed to send message', err); }

    setPendingFiles([]);
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
    <div className="flex-1 flex flex-col bg-background h-full min-w-0 relative">
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
            {messages.map((msg, idx) => {
              // msg.sender is { id, username, ... } (from FastAPI)
              const prevSenderId = idx > 0 ? messages[idx - 1].sender?.id : null;
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
                        {msg.content && (
                          <span className={`text-text-normal break-words leading-relaxed ${msg.deleted ? 'text-text-muted italic' : ''}`}>
                            {msg.content}
                            {msg.isEdited && !msg.deleted && <span className="text-[10px] text-text-muted ml-1">(edited)</span>}
                          </span>
                        )}
                        {!msg.deleted && msg.attachments?.length > 0 && (
                          <AttachmentRenderer attachments={msg.attachments} />
                        )}
                      </div>
                    )}

                    {isOwn && !msg.deleted && editingMessageId !== msg.id && (
                      <div className="absolute right-0 -top-4 opacity-0 group-hover:opacity-100 bg-[#313338] border border-divider shadow-sm rounded flex items-center overflow-hidden transition-opacity">
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
          <div className="bg-[#2b2d31] rounded-t-lg p-4 flex gap-4 overflow-x-auto border-b border-divider">
            {pendingFiles.map((file, idx) => {
              const isImage = file.type.startsWith('image/');
              return (
                <div key={idx} className="relative w-40 h-40 bg-[#1e1f22] rounded flex flex-col items-center justify-center p-2 group shrink-0">
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
          <input type="file" multiple className="hidden" ref={fileInputRef} onChange={(e) => e.target.files && setPendingFiles(Array.from(e.target.files))} />
          <button type="button" className="text-interactive-normal hover:text-interactive-hover mr-4" onClick={() => fileInputRef.current?.click()} disabled={isUploading}>
            <PlusCircle size={24} />
          </button>
          <input
            type="text"
            value={message}
            onChange={handleTyping}
            disabled={isUploading}
            placeholder={friend ? `Message @${friend.username}` : 'Message'}
            className="flex-1 bg-transparent text-text-normal focus:outline-none py-1.5 disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={isUploading || (!message.trim() && pendingFiles.length === 0)}
            className={`${message.trim() || pendingFiles.length > 0 ? 'text-primary' : 'text-interactive-normal'} ml-2 transition-colors disabled:opacity-50 flex items-center`}
          >
            {isUploading ? <Loader2 size={20} className="animate-spin" /> : <Send size={20} />}
          </button>
        </form>
      </div>
    </div>
  );
};
