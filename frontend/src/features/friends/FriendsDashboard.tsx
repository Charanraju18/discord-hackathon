import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Users } from 'lucide-react';
import { AddFriend } from './components/AddFriend';
import { FriendCard } from './components/FriendCard';
import { API_BASE_URL } from '../../config';

interface FriendsDashboardProps {
  activeTab: string;
  onCountsUpdate: (pending: number) => void;
}

export const FriendsDashboard: React.FC<FriendsDashboardProps> = ({ activeTab, onCountsUpdate }) => {
  const [friends, setFriends] = useState<any[]>([]);
  const [incoming, setIncoming] = useState<any[]>([]);
  const [outgoing, setOutgoing] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchFriendsAndRequests = async () => {
    try {
      const token = localStorage.getItem('token');
      const [friendsRes, requestsRes] = await Promise.all([
        axios.get(`${API_BASE_URL}/api/friends`, { headers: { Authorization: `Bearer ${token}` } }),
        axios.get(`${API_BASE_URL}/api/friends/requests`, { headers: { Authorization: `Bearer ${token}` } })
      ]);

      if (friendsRes.data.success) {
        setFriends(friendsRes.data.data);
      }
      if (requestsRes.data.success) {
        setIncoming(requestsRes.data.data.incoming);
        setOutgoing(requestsRes.data.data.outgoing);
        onCountsUpdate(requestsRes.data.data.incomingCount);
      }
    } catch (err) {
      console.error('Failed to fetch friends data', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFriendsAndRequests();
  }, [activeTab]);

  const handleAccept = async (requestId: string) => {
    setActionLoading(requestId);
    try {
      const token = localStorage.getItem('token');
      await axios.post(`${API_BASE_URL}/api/friends/request/${requestId}/accept`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchFriendsAndRequests();
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async (requestId: string) => {
    setActionLoading(requestId);
    try {
      const token = localStorage.getItem('token');
      await axios.post(`${API_BASE_URL}/api/friends/request/${requestId}/reject`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchFriendsAndRequests();
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoading(null);
    }
  };

  const handleRemove = async (friendId: string) => {
    if (!window.confirm('Are you sure you want to remove this friend?')) return;
    setActionLoading(friendId);
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${API_BASE_URL}/api/friends/${friendId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchFriendsAndRequests();
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoading(null);
    }
  };

  const renderContent = () => {
    if (loading) return <div className="p-6 text-text-muted">Loading...</div>;

    if (activeTab === 'add') {
      return <AddFriend />;
    }

    if (activeTab === 'online' || activeTab === 'all') {
      const displayFriends = activeTab === 'online' ? friends.filter(f => f.status === 'online') : friends;
      
      if (displayFriends.length === 0) {
        return (
          <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
            <div className="w-64 h-48 mb-8 bg-white/5 rounded-lg flex items-center justify-center">
              <Users size={64} className="text-text-muted opacity-50" />
            </div>
            <p className="text-text-muted">No one's around to play with Wumpus.</p>
          </div>
        );
      }

      return (
        <div className="p-6">
          <h3 className="text-xs font-bold text-text-muted uppercase mb-4 tracking-wider">
            {activeTab === 'online' ? 'Online' : 'All Friends'} — {displayFriends.length}
          </h3>
          <div className="flex flex-col">
            {displayFriends.map(friend => (
              <FriendCard 
                key={friend._id} 
                user={friend} 
                type="friend" 
                onRemove={() => handleRemove(friend._id)}
                actionLoading={actionLoading === friend._id}
              />
            ))}
          </div>
        </div>
      );
    }

    if (activeTab === 'pending') {
      if (incoming.length === 0 && outgoing.length === 0) {
        return (
          <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
            <div className="w-64 h-48 mb-8 bg-white/5 rounded-lg flex items-center justify-center">
              <Users size={64} className="text-text-muted opacity-50" />
            </div>
            <p className="text-text-muted">There are no pending friend requests. Here's a potato for now.</p>
          </div>
        );
      }

      return (
        <div className="p-6">
          <h3 className="text-xs font-bold text-text-muted uppercase mb-4 tracking-wider">
            Pending — {incoming.length + outgoing.length}
          </h3>
          <div className="flex flex-col">
            {incoming.map(req => (
              <FriendCard 
                key={req._id} 
                user={{ _id: req._id, username: req.senderId.username }} 
                type="incoming" 
                onAccept={() => handleAccept(req._id)}
                onReject={() => handleReject(req._id)}
                actionLoading={actionLoading === req._id}
              />
            ))}
            {outgoing.map(req => (
              <FriendCard 
                key={req._id} 
                user={{ _id: req._id, username: req.receiverId.username }} 
                type="outgoing" 
                onReject={() => handleReject(req._id)}
                actionLoading={actionLoading === req._id}
              />
            ))}
          </div>
        </div>
      );
    }
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-background">
      {/* Header handled by AppLayout for tabs, but we'll render content below */}
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        {renderContent()}
      </div>
    </div>
  );
};
