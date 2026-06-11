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
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
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
        // Backend expects `q` param and returns array directly (no {success,data} wrapper)
        const res = await axios.get(`${API_BASE_URL}/api/users/search?q=${encodeURIComponent(query)}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setResults(Array.isArray(res.data) ? res.data : []);
      } catch (err) {
        console.error('Search failed', err);
        setResults([]);
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
      // FastAPI returns { message: "Friend request sent" } directly — no .success wrapper
      await axios.post(
        `${API_BASE_URL}/api/friends/request`,
        { receiver_id: userId },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setSuccessId(userId);
      setTimeout(() => {
        setResults(prev => prev.filter(u => u.id !== userId));
      }, 2000);
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
        You can add friends with their username.
      </p>

      <div className="relative mb-6">
        <div className="bg-[#1e1f22] border border-[#1e1f22] focus-within:border-[#00a8fc] rounded-lg flex items-center px-3 transition-colors">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by username..."
            className="flex-1 bg-transparent text-white p-3 focus:outline-none placeholder-text-muted"
          />
        </div>
      </div>

      <div className="border-t border-divider pt-6">
        {loading && <div className="text-text-muted text-sm text-center">Searching...</div>}
        {!loading && query && results.length === 0 && (
          <div className="flex flex-col items-center justify-center py-10">
            <Search size={48} className="text-text-muted mb-4 opacity-50" />
            <span className="text-text-muted">No users found. Check the spelling and try again.</span>
          </div>
        )}

        <div className="space-y-2">
          {results.map((u) => {
            // FastAPI UserResponse returns `id` not `_id`
            const isOverride = presenceOverrides[u.id];
            const isOnline = isOverride !== undefined ? isOverride : (onlineUsers.includes(u.id) || u.isOnline);

            return (
              <div
                key={u.id}
                className="flex items-center justify-between p-3 hover:bg-white/5 rounded-lg border border-transparent hover:border-divider transition-colors"
              >
                <div className="flex items-center">
                  <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-white font-bold mr-4 relative">
                    {u.username.charAt(0).toUpperCase()}
                    <div className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-background ${isOnline ? 'bg-[#23a559]' : 'bg-[#80848e]'}`} />
                  </div>
                  <span className="font-semibold text-white">{u.username}</span>
                </div>
                <button
                  onClick={() => handleSendRequest(u.id)}
                  disabled={sendingId === u.id || successId === u.id}
                  className={`px-4 py-1.5 rounded font-medium text-sm transition-colors ${
                    successId === u.id
                      ? 'bg-transparent text-[#23a559] border border-[#23a559]'
                      : 'bg-primary text-white hover:bg-primary-hover disabled:opacity-50'
                  }`}
                >
                  {successId === u.id ? 'Friend Request Sent' : sendingId === u.id ? 'Sending...' : 'Send Friend Request'}
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
