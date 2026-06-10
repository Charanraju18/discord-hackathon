import React, { useState, useRef, useEffect } from "react";
import { Bell, Check, X } from "lucide-react";
import axios from "axios";
import { API_BASE_URL } from "../../config";
import { useNotification } from "./NotificationContext";

export const NotificationCenter: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const { notifications, unreadCount, markAsRead, refreshNotifications } =
    useNotification();

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleAction = async (
    type: string,
    action: "accept" | "reject",
    id: string,
  ) => {
    setActionLoading(id);
    try {
      const token = localStorage.getItem("token");

      if (type === "server_invitation") {
        if (action === "accept") {
          await axios.post(
            `${API_BASE_URL}/api/server-invitations/${id}/accept`,
            {},
            {
              headers: { Authorization: `Bearer ${token}` },
            },
          );
        } else {
          await axios.post(
            `${API_BASE_URL}/api/server-invitations/${id}/reject`,
            {},
            {
              headers: { Authorization: `Bearer ${token}` },
            },
          );
        }
      } else if (type === "friend_request") {
        if (action === "accept") {
          await axios.post(
            `${API_BASE_URL}/api/friends/request/${id}/accept`,
            {},
            {
              headers: { Authorization: `Bearer ${token}` },
            },
          );
        } else {
          await axios.post(
            `${API_BASE_URL}/api/friends/request/${id}/reject`,
            {},
            {
              headers: { Authorization: `Bearer ${token}` },
            },
          );
        }
      }

      markAsRead(id);
      refreshNotifications(); // To update the Friends Dashboard if visible

      // Full refresh could also reload servers if an invite was accepted,
      // but AppLayout already fetches servers on mount. In a robust app,
      // we'd emit an event or update global server state.
      if (type === "server_invitation" && action === "accept") {
        window.location.reload(); // Quick hack for MVP to refresh server list
      }
    } catch (err) {
      console.error("Failed to process notification action", err);
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-8 h-8 flex items-center justify-center text-text-muted hover:text-text-normal hover:bg-white/10 rounded relative transition-colors"
      >
        <Bell size={20} />
        {unreadCount > 0 && (
          <div className="absolute top-0 right-0 w-3.5 h-3.5 bg-[#f23f42] rounded-full border-2 border-[#232428] flex items-center justify-center text-[8px] font-bold text-white">
            {unreadCount > 9 ? "9+" : unreadCount}
          </div>
        )}
      </button>

      {isOpen && (
        <div className="absolute bottom-full left-0 mb-2 w-80 bg-[#2b2d31] rounded-lg shadow-xl border border-divider overflow-hidden z-50">
          <div className="px-4 py-3 border-b border-divider bg-[#2b2d31]">
            <h3 className="font-bold text-white">Notifications</h3>
          </div>

          <div className="max-h-[300px] overflow-y-auto custom-scrollbar">
            {notifications.length === 0 ? (
              <div className="py-8 px-4 text-center text-text-muted flex flex-col items-center">
                <Bell size={32} className="opacity-20 mb-2" />
                <p className="text-sm">No new notifications.</p>
              </div>
            ) : (
              <div className="flex flex-col">
                {notifications.map((notif) => (
                  <div
                    key={notif.id}
                    className="px-4 py-3 border-b border-divider hover:bg-white/5 transition-colors"
                  >
                    {notif.type === "server_invitation" && (
                      <div className="flex flex-col">
                        <span className="text-sm text-text-normal mb-2">
                          <strong className="text-white">
                            {notif.data.senderId?.username}
                          </strong>{" "}
                          invited you to join{" "}
                          <strong className="text-white">
                            {notif.data.serverId?.name}
                          </strong>
                        </span>
                        <div className="flex space-x-2">
                          <button
                            onClick={() =>
                              handleAction(
                                "server_invitation",
                                "accept",
                                notif.id,
                              )
                            }
                            disabled={actionLoading === notif.id}
                            className="flex-1 bg-[#23a559] hover:bg-[#1f8c4c] text-white py-1.5 rounded text-xs font-medium transition-colors flex items-center justify-center"
                          >
                            <Check size={14} className="mr-1" /> Accept
                          </button>
                          <button
                            onClick={() =>
                              handleAction(
                                "server_invitation",
                                "reject",
                                notif.id,
                              )
                            }
                            disabled={actionLoading === notif.id}
                            className="flex-1 bg-[#f23f42] hover:bg-[#da373c] text-white py-1.5 rounded text-xs font-medium transition-colors flex items-center justify-center"
                          >
                            <X size={14} className="mr-1" /> Ignore
                          </button>
                        </div>
                      </div>
                    )}

                    {notif.type === "friend_request" && (
                      <div className="flex flex-col">
                        <span className="text-sm text-text-normal mb-2">
                          <strong className="text-white">
                            {notif.data.senderId?.username}
                          </strong>{" "}
                          sent you a friend request.
                        </span>
                        <div className="flex space-x-2">
                          <button
                            onClick={() =>
                              handleAction("friend_request", "accept", notif.id)
                            }
                            disabled={actionLoading === notif.id}
                            className="flex-1 bg-[#23a559] hover:bg-[#1f8c4c] text-white py-1.5 rounded text-xs font-medium transition-colors flex items-center justify-center"
                          >
                            <Check size={14} className="mr-1" /> Accept
                          </button>
                          <button
                            onClick={() =>
                              handleAction("friend_request", "reject", notif.id)
                            }
                            disabled={actionLoading === notif.id}
                            className="flex-1 bg-[#f23f42] hover:bg-[#da373c] text-white py-1.5 rounded text-xs font-medium transition-colors flex items-center justify-center"
                          >
                            <X size={14} className="mr-1" /> Ignore
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
