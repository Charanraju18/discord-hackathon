import React, { useState } from "react";
import { NavLink, useParams } from "react-router-dom";
import axios from "axios";
import { Plus } from "lucide-react";
import { API_BASE_URL } from "../../config";
import discordIcons from "../../assets/discord-icon.png";
import { getServerInitials } from "../../utils/serverInitials";
import { useSocket } from "../socket/SocketContext";

interface ServerSidebarProps {
  servers: any[];
  onServerCreated: (server: any) => void;
}

export const ServerSidebar: React.FC<ServerSidebarProps> = ({
  servers,
  onServerCreated,
}) => {
  const [showModal, setShowModal] = useState(false);
  const [newServerName, setNewServerName] = useState("");
  const { unreadServers, unreadDMs } = useSocket();
  const { serverId: activeServerId } = useParams<{ serverId?: string }>();
  const totalDMUnread = Object.values(unreadDMs).reduce((sum, n) => sum + n, 0);

  const handleCreateServer = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem("token");
      const res = await axios.post(
        `${API_BASE_URL}/api/servers`,
        { name: newServerName },
        { headers: { Authorization: `Bearer ${token}` } },
      );
      if (res.data && res.data.id) {
        onServerCreated(res.data);
        setShowModal(false);
        setNewServerName("");
      }
    } catch (err) {
      console.error("Failed to create server", err);
    }
  };

  return (
    <div className="w-18 bg-server-bg flex flex-col items-center py-3 gap-2 overflow-y-auto shrink-0 z-20">
      {/* DM / Home button */}
      <NavLink
        to="/channels/@me"
        className={({ isActive }) =>
          `relative w-12 h-12 rounded-3xl flex items-center justify-center bg-background text-white transition-all duration-200 hover:rounded-2xl hover:bg-primary ${isActive ? "bg-primary rounded-2xl" : ""}`
        }
      >
        <img className="w-9 h-9" src={discordIcons} alt="Home" />
        {totalDMUnread > 0 && (
          <div className="absolute -top-1 -right-1 min-w-4 h-4 bg-[#f23f42] rounded-full flex items-center justify-center text-[9px] font-bold text-white px-1 border-2 border-server-bg">
            {totalDMUnread > 99 ? "99+" : totalDMUnread}
          </div>
        )}
      </NavLink>

      <div className="w-8 h-0.5 bg-divider rounded my-1" />

      {/* Server icons */}
      {servers.map((server) => {
        const unreadCount = unreadServers[server.id] ?? 0;
        const isActive = activeServerId === server.id;

        return (
          <NavLink
            key={server.id}
            to={`/channels/${server.id}`}
            className="relative flex items-center group"
          >
            {/* Discord-style left pill indicator */}
            <div
              className={`absolute -left-3 w-1 rounded-r bg-white transition-all duration-200 ${
                isActive
                  ? "h-10"                         // full pill when active
                  : unreadCount > 0
                  ? "h-2 group-hover:h-5"          // short pill for unread, grows on hover
                  : "h-0 group-hover:h-5"          // invisible, appears on hover
              }`}
            />

            {/* Server icon */}
            <div
              className={`w-12 h-12 rounded-3xl flex items-center justify-center bg-background text-white transition-all duration-200 hover:rounded-2xl hover:bg-primary relative ${
                isActive ? "bg-primary rounded-2xl" : ""
              } ${unreadCount > 0 && !isActive ? "ring-2 ring-white/20" : ""}`}
            >
              <span className="text-xs font-bold leading-none select-none">
                {getServerInitials(server.name)}
              </span>

              {/* Unread count badge — top-right */}
              {unreadCount > 0 && !isActive && (
                <div className="absolute -top-1 -right-1 min-w-4 h-4 bg-[#f23f42] rounded-full flex items-center justify-center text-[9px] font-bold text-white px-1 border-2 border-server-bg">
                  {unreadCount > 99 ? "99+" : unreadCount}
                </div>
              )}
            </div>
          </NavLink>
        );
      })}

      {/* Add server */}
      <button
        onClick={() => setShowModal(true)}
        className="w-12 h-12 rounded-3xl flex items-center justify-center bg-background text-[#23a559] transition-all duration-200 hover:rounded-2xl hover:bg-[#23a559] hover:text-white"
      >
        <Plus size={24} />
      </button>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-background p-6 rounded-lg w-96 shadow-xl">
            <h2 className="text-xl font-bold text-white mb-2">
              Customize your server
            </h2>
            <p className="text-text-muted text-sm mb-4">
              Give your new server a personality with a name.
            </p>
            <form onSubmit={handleCreateServer}>
              <label className="block text-xs font-bold text-text-muted uppercase mb-2">
                Server Name
              </label>
              <input
                type="text"
                value={newServerName}
                onChange={(e) => setNewServerName(e.target.value)}
                className="w-full bg-server-bg text-white p-2.5 rounded border border-transparent focus:outline-none mb-6"
                placeholder="My Awesome Server"
                required
              />
              <div className="flex justify-between items-center bg-channel-bg -mx-6 -mb-6 p-4 rounded-b-lg">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="text-text-normal hover:underline text-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-primary text-white px-6 py-2 rounded font-medium hover:bg-primary-hover transition-colors"
                >
                  Create
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
