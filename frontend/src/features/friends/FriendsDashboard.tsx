import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { Users, Inbox } from "lucide-react";
import { AddFriend } from "./components/AddFriend";
import { FriendCard } from "./components/FriendCard";
import { ActiveNowPanel } from "./components/ActiveNowPanel";
import { useSocket } from "../socket/SocketContext";
import { useNotification } from "../notifications/NotificationContext";
import { API_BASE_URL } from "../../config";

type Tab = "online" | "all" | "pending" | "add";

export const FriendsDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState<Tab>("online");
  const [friends, setFriends] = useState<any[]>([]);
  const [incoming, setIncoming] = useState<any[]>([]);
  const [outgoing, setOutgoing] = useState<any[]>([]);
  const [pendingCount, setPendingCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const { socket, onlineUsers, presenceOverrides } = useSocket();
  const { markAsRead } = useNotification();
  const navigate = useNavigate();

  // Refs so socket callbacks always read latest values without re-registering
  const onlineUsersRef = useRef(onlineUsers);
  const presenceOverridesRef = useRef(presenceOverrides);
  useEffect(() => {
    onlineUsersRef.current = onlineUsers;
  }, [onlineUsers]);
  useEffect(() => {
    presenceOverridesRef.current = presenceOverrides;
  }, [presenceOverrides]);

  const fetchFriendsAndRequests = async () => {
    try {
      const token = localStorage.getItem("token");
      const [friendsRes, requestsRes] = await Promise.all([
        axios.get(`${API_BASE_URL}/api/friends`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        axios.get(`${API_BASE_URL}/api/friends/requests`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      const friendList = Array.isArray(friendsRes.data) ? friendsRes.data : [];
      const mappedFriends = friendList.map((f: any) => {
        const fu = f.friend;
        const isOverride = presenceOverridesRef.current[fu.id];
        const isOnlineNow =
          isOverride !== undefined
            ? isOverride
            : fu.isOnline || onlineUsersRef.current.includes(fu.id);
        return {
          _id: fu.id,
          username: fu.username,
          isOnline: fu.isOnline,
          status: isOnlineNow ? "online" : "offline",
        };
      });
      setFriends(mappedFriends);

      const reqData = requestsRes.data || {};
      setIncoming(reqData.incoming || []);
      setOutgoing(reqData.outgoing || []);
      setPendingCount(reqData.incomingCount ?? 0);
    } catch (err) {
      console.error("Failed to fetch friends data", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFriendsAndRequests();
  }, [activeTab]);

  // Real-time presence updates
  useEffect(() => {
    setFriends((prev) =>
      prev.map((f) => {
        const isOverride = presenceOverrides[f._id];
        const isOnlineNow =
          isOverride !== undefined
            ? isOverride
            : f.isOnline || onlineUsers.includes(f._id);
        return { ...f, status: isOnlineNow ? "online" : "offline" };
      }),
    );
  }, [onlineUsers, presenceOverrides]);

  // Real-time socket updates: incoming requests + accepted requests
  useEffect(() => {
    if (!socket) return;

    // Received a new incoming friend request
    const handleNotification = (notif: any) => {
      if (notif.type !== "friend_request") return;
      const req = notif.data;
      setIncoming((prev) => {
        if (prev.some((r) => r.id === req.id)) return prev;
        return [
          ...prev,
          { id: req.id, sender: req.sender, createdAt: req.createdAt },
        ];
      });
      setPendingCount((prev) => prev + 1);
    };

    // A friend request was accepted (applies to both sender and accepter)
    const handleRequestAccepted = (data: any) => {
      const { requestId, newFriend } = data;

      // Remove the request from whichever list it was in
      setIncoming((prev) => prev.filter((r) => r.id !== requestId));
      setOutgoing((prev) => prev.filter((r) => r.id !== requestId));
      setPendingCount((prev) => Math.max(0, prev - 1));

      // Add the new friend to friends list (deduplicated)
      if (newFriend) {
        setFriends((prev) => {
          if (prev.some((f) => f._id === newFriend.id)) return prev;
          const isOverride = presenceOverridesRef.current[newFriend.id];
          const isOnlineNow =
            isOverride !== undefined
              ? isOverride
              : newFriend.isOnline ||
                onlineUsersRef.current.includes(newFriend.id);
          return [
            ...prev,
            {
              _id: newFriend.id,
              username: newFriend.username,
              isOnline: newFriend.isOnline,
              status: isOnlineNow ? "online" : "offline",
            },
          ];
        });
      }
    };

    socket.on("notification-created", handleNotification);
    socket.on("friend_request_accepted", handleRequestAccepted);
    return () => {
      socket.off("notification-created", handleNotification);
      socket.off("friend_request_accepted", handleRequestAccepted);
    };
  }, [socket]);

  const handleAccept = async (requestId: string) => {
    setActionLoading(requestId);
    try {
      const token = localStorage.getItem("token");
      await axios.post(
        `${API_BASE_URL}/api/friends/request/${requestId}/accept`,
        {},
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );

      // Direct state mutation — backend emits friend_request_accepted which handles the rest.
      // We also clear the notification badge immediately.
      markAsRead(requestId);
      setIncoming((prev) => prev.filter((r) => r.id !== requestId));
      setPendingCount((prev) => Math.max(0, prev - 1));

      // Add friend from incoming request data
      const req = incoming.find((r) => r.id === requestId);
      if (req?.sender) {
        setFriends((prev) => {
          if (prev.some((f) => f._id === req.sender.id)) return prev;
          const isOverride = presenceOverridesRef.current[req.sender.id];
          const isOnlineNow =
            isOverride !== undefined
              ? isOverride
              : req.sender.isOnline ||
                onlineUsersRef.current.includes(req.sender.id);
          return [
            ...prev,
            {
              _id: req.sender.id,
              username: req.sender.username,
              isOnline: req.sender.isOnline ?? false,
              status: isOnlineNow ? "online" : "offline",
            },
          ];
        });
      }
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async (requestId: string) => {
    setActionLoading(requestId);
    try {
      const token = localStorage.getItem("token");
      await axios.post(
        `${API_BASE_URL}/api/friends/request/${requestId}/reject`,
        {},
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      markAsRead(requestId);
      const wasIncoming = incoming.some((r) => r.id === requestId);
      if (wasIncoming) setPendingCount((prev) => Math.max(0, prev - 1));
      setIncoming((prev) => prev.filter((r) => r.id !== requestId));
      setOutgoing((prev) => prev.filter((r) => r.id !== requestId));
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoading(null);
    }
  };

  const handleRemove = async (friendUserId: string) => {
    if (!window.confirm("Are you sure you want to remove this friend?")) return;
    setActionLoading(friendUserId);
    try {
      const token = localStorage.getItem("token");
      await axios.delete(`${API_BASE_URL}/api/friends/${friendUserId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setFriends((prev) => prev.filter((f) => f._id !== friendUserId));
    } catch (err) {
      console.error("Failed to remove friend", err);
    } finally {
      setActionLoading(null);
    }
  };

  const handleMessage = async (friendUserId: string) => {
    setActionLoading(friendUserId);
    try {
      const token = localStorage.getItem("token");
      const res = await axios.post(
        `${API_BASE_URL}/api/dms/start`,
        { friendId: friendUserId },
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      if (res.data && res.data.id) {
        navigate(`/channels/@me/${res.data.id}`);
      }
    } catch (err) {
      console.error("Failed to start DM", err);
    } finally {
      setActionLoading(null);
    }
  };

  const tabs: { id: Tab; label: string }[] = [
    { id: "online", label: "Online" },
    { id: "all", label: "All" },
    { id: "pending", label: "Pending" },
    { id: "add", label: "Add Friend" },
  ];

  const renderContent = () => {
    if (loading) return <div className="p-6 text-text-muted">Loading...</div>;

    if (activeTab === "add") return <AddFriend />;

    if (activeTab === "online") {
      const onlineFriends = friends.filter((f) => f.status === "online");
      return (
        <div className="flex-1 overflow-y-auto px-6 pt-4 custom-scrollbar">
          <h3 className="uppercase text-xs font-bold text-text-muted mb-2 tracking-wide">
            Online — {onlineFriends.length}
          </h3>
          {onlineFriends.length === 0 ? (
            <div className="flex flex-col items-center justify-center mt-20 text-center">
              <div className="w-64 h-44 bg-server-bg rounded-lg mb-6 flex items-center justify-center">
                <span className="text-text-muted text-sm px-4">
                  No one's around to play with Wumpus.
                </span>
              </div>
            </div>
          ) : (
            <div>
              {onlineFriends.map((f) => (
                <FriendCard
                  key={f._id}
                  user={f}
                  type="friend"
                  onMessage={handleMessage}
                  onRemove={() => handleRemove(f._id)}
                  actionLoading={actionLoading === f._id}
                />
              ))}
            </div>
          )}
        </div>
      );
    }

    if (activeTab === "all") {
      const sorted = [...friends].sort(
        (a, b) =>
          (b.status === "online" ? 1 : 0) - (a.status === "online" ? 1 : 0),
      );
      return (
        <div className="flex-1 overflow-y-auto px-6 pt-4 custom-scrollbar">
          <h3 className="uppercase text-xs font-bold text-text-muted mb-2 tracking-wide">
            All Friends — {friends.length}
          </h3>
          {friends.length === 0 ? (
            <div className="flex flex-col items-center justify-center mt-20 text-center">
              <div className="w-64 h-44 bg-server-bg rounded-lg mb-6 flex items-center justify-center">
                <span className="text-text-muted text-sm px-4">
                  Wumpus is waiting on friends.
                </span>
              </div>
            </div>
          ) : (
            <div>
              {sorted.map((f) => (
                <FriendCard
                  key={f._id}
                  user={f}
                  type="friend"
                  onMessage={handleMessage}
                  onRemove={() => handleRemove(f._id)}
                  actionLoading={actionLoading === f._id}
                />
              ))}
            </div>
          )}
        </div>
      );
    }

    if (activeTab === "pending") {
      if (incoming.length === 0 && outgoing.length === 0) {
        return (
          <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
            <div className="w-64 h-48 mb-8 bg-white/5 rounded-lg flex items-center justify-center">
              <Inbox size={64} className="text-text-muted opacity-50" />
            </div>
            <p className="text-text-muted">
              There are no pending friend requests. Here's a potato for now.
            </p>
          </div>
        );
      }
      return (
        <div className="flex-1 overflow-y-auto px-6 pt-4 custom-scrollbar">
          <h3 className="uppercase text-xs font-bold text-text-muted mb-2 tracking-wide">
            Pending — {incoming.length + outgoing.length}
          </h3>
          <div>
            {incoming.map((req) => (
              <FriendCard
                key={req.id}
                user={{ _id: req.id, username: req.sender.username }}
                type="incoming"
                onAccept={() => handleAccept(req.id)}
                onReject={() => handleReject(req.id)}
                actionLoading={actionLoading === req.id}
              />
            ))}
            {outgoing.map((req) => (
              <FriendCard
                key={req.id}
                user={{ _id: req.id, username: req.receiver.username }}
                type="outgoing"
                onReject={() => handleReject(req.id)}
                actionLoading={actionLoading === req.id}
              />
            ))}
          </div>
        </div>
      );
    }
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-background">
      <div className="h-12 border-b border-divider flex items-center px-4 shrink-0 shadow-sm gap-1">
        <div className="flex items-center">
          <Users size={24} className="text-text-muted mr-3" />
          <span className="font-bold text-white mr-3">Friends</span>
        </div>
        <div className="w-px h-5 bg-divider mx-1" />
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`relative px-3 py-1 rounded text-sm font-medium transition-colors ${
              activeTab === tab.id
                ? "bg-white/10 text-white"
                : "text-text-muted hover:bg-white/5 hover:text-interactive-hover"
            } ${tab.id === "add" ? "text-white! bg-[#248046]! hover:bg-[#1a6334]!" : ""}`}
          >
            {tab.label}
            {tab.id === "pending" && pendingCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-[#f23f42] text-white text-[9px] font-bold px-1 py-0.5 rounded-full leading-none min-w-4 text-center">
                {pendingCount}
              </span>
            )}
          </button>
        ))}
      </div>

      <div className="flex flex-1 min-h-0">
        <div className="flex-1 flex flex-col min-h-0">{renderContent()}</div>
        {activeTab !== "add" && <ActiveNowPanel />}
      </div>
    </div>
  );
};
