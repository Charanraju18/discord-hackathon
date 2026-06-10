import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { Search } from 'lucide-react';
import { useSocket } from '../../socket/SocketContext';
import { API_BASE_URL } from '../../../config';

export const AddFriend: React.FC = () => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [sendingId, setSendingId] = useState<string | null>(null);
  const [successId, setSuccessId] = useState<string | null>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const { onlineUsers, presenceOverrides } = useSocket();

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }

    if (debounceRef.current) clearTimeout(debounceRef.current);

    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const token = localStorage.getItem('token');
        const res = await axios.get(`${API_BASE_URL}/api/users/search?query=${encodeURIComponent(query)}&limit=10`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.data.success) {
          setResults(res.data.data);
        }
      } catch (err) {
        console.error('Search failed', err);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query]);

  const handleSendRequest = async (userId: string) => {
    setSendingId(userId);
    try {
      const token = localStorage.getItem('token');
      const res = await axios.post(`${API_BASE_URL}/api/friends/request`, 
        { receiverId: userId },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (res.data.success) {
        setSuccessId(userId);
        setTimeout(() => {
          setResults(prev => prev.filter(u => u._id !== userId));
        }, 2000);
      }
    } catch (err) {
      console.error('Failed to send request', err);
    } finally {
      setSendingId(null);
    }
  };

  return (
    <div className="p-6 max-w-3xl">
      <h2 className="text-white font-bold mb-2">ADD FRIEND</h2>
      <p className="text-sm text-text-muted mb-4">
        You can add friends with their Discord username.
      </p>

      <div className="relative mb-6">
        <div className="bg-[#1e1f22] border border-[#1e1f22] focus-within:border-[#00a8fc] rounded-lg flex items-center px-3 transition-colors">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="You can add friends with their Discord username."
            className="flex-1 bg-transparent text-white p-3 focus:outline-none placeholder-text-muted"
          />
        </div>
      </div>

      <div className="border-t border-divider pt-6">
        {loading && <div className="text-text-muted text-sm text-center">Searching...</div>}
        {!loading && query && results.length === 0 && (
          <div className="flex flex-col items-center justify-center py-10">
            <Search size={48} className="text-text-muted mb-4 opacity-50" />
            <span className="text-text-muted">Hm, didn't work. Double check that the capitalization, spelling, any spaces, and numbers are correct.</span>
          </div>
        )}
        
        <div className="space-y-2">
          {results.map((user) => {
            const isOverride = presenceOverrides[user._id];
            const isOnline = isOverride !== undefined ? isOverride : (onlineUsers.includes(user._id) || user.isOnline);

            return (
            <div key={user._id} className="flex items-center justify-between p-3 hover:bg-white/5 rounded-lg border border-transparent hover:border-divider transition-colors group">
              <div className="flex items-center">
                <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-white font-bold mr-4 relative">
                  {user.username.charAt(0).toUpperCase()}
                  <div className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-[#313338] ${isOnline ? 'bg-[#23a559]' : 'bg-[#80848e]'}`} />
                </div>
                <span className="font-semibold text-white">{user.username}</span>
              </div>
              <button
                onClick={() => handleSendRequest(user._id)}
                disabled={sendingId === user._id || successId === user._id}
                className={`px-4 py-1.5 rounded font-medium text-sm transition-colors ${
                  successId === user._id 
                    ? 'bg-transparent text-[#23a559] border border-[#23a559]'
                    : 'bg-primary text-white hover:bg-primary-hover disabled:opacity-50'
                }`}
              >
                {successId === user._id ? 'Friend Request Sent' : sendingId === user._id ? 'Sending...' : 'Send Friend Request'}
              </button>
            </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
