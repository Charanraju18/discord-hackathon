import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import axios from 'axios';
import { Plus } from 'lucide-react';

interface ServerSidebarProps {
  servers: any[];
  onServerCreated: (server: any) => void;
}

export const ServerSidebar: React.FC<ServerSidebarProps> = ({ servers, onServerCreated }) => {
  const [showModal, setShowModal] = useState(false);
  const [newServerName, setNewServerName] = useState('');

  const handleCreateServer = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      const res = await axios.post('http://localhost:5000/api/servers', 
        { name: newServerName },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (res.data.success) {
        onServerCreated(res.data.data);
        setShowModal(false);
        setNewServerName('');
      }
    } catch (err) {
      console.error('Failed to create server', err);
    }
  };

  return (
    <div className="w-[72px] bg-server-bg flex flex-col items-center py-3 gap-2 overflow-y-auto shrink-0 z-20">
      <NavLink 
        to="/channels/@me"
        className={({ isActive }) => `w-12 h-12 rounded-[24px] flex items-center justify-center bg-background text-white transition-all duration-200 hover:rounded-[16px] hover:bg-primary ${isActive ? 'bg-primary rounded-[16px]' : ''}`}
      >
        <span className="font-bold text-xl">D</span>
      </NavLink>

      <div className="w-8 h-[2px] bg-divider rounded my-1" />

      {servers.map((server) => (
        <NavLink
          key={server._id}
          to={`/channels/${server._id}`}
          className={({ isActive }) => `w-12 h-12 rounded-[24px] flex items-center justify-center bg-background text-white transition-all duration-200 hover:rounded-[16px] hover:bg-primary ${isActive ? 'bg-primary rounded-[16px]' : ''}`}
        >
          {server.name.charAt(0).toUpperCase()}
        </NavLink>
      ))}

      <button
        onClick={() => setShowModal(true)}
        className="w-12 h-12 rounded-[24px] flex items-center justify-center bg-background text-[#23a559] transition-all duration-200 hover:rounded-[16px] hover:bg-[#23a559] hover:text-white"
      >
        <Plus size={24} />
      </button>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-background p-6 rounded-lg w-96 shadow-xl">
            <h2 className="text-xl font-bold text-white mb-2">Customize your server</h2>
            <p className="text-text-muted text-sm mb-4">Give your new server a personality with a name.</p>
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
                <button type="button" onClick={() => setShowModal(false)} className="text-text-normal hover:underline text-sm">
                  Cancel
                </button>
                <button type="submit" className="bg-primary text-white px-6 py-2 rounded font-medium hover:bg-primary-hover transition-colors">
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
