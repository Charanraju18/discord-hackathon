import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Crown } from 'lucide-react';
import { useSocket } from '../socket/SocketContext';

interface Member {
  _id: string;
  username: string;
  email: string;
}

interface MembersSidebarProps {
  serverId: string;
  isOpenMobile: boolean;
  onCloseMobile: () => void;
}

export const MembersSidebar: React.FC<MembersSidebarProps> = ({ serverId, isOpenMobile, onCloseMobile }) => {
  const [members, setMembers] = useState<Member[]>([]);
  const [ownerId, setOwnerId] = useState<string | null>(null);
  const { onlineUsers } = useSocket();

  useEffect(() => {
    const fetchMembers = async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await axios.get(`http://localhost:5000/api/servers/${serverId}/members`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.data.success) {
          // Fallback array support in case backend hasn't restarted yet
          const data = res.data.data;
          if (Array.isArray(data)) {
            setMembers(data);
          } else {
            setMembers(data.members);
            setOwnerId(data.ownerId);
          }
        }
      } catch (err) {
        console.error('Failed to fetch members', err);
      }
    };
    if (serverId) {
      fetchMembers();
    }
  }, [serverId]);

  const onlineMembers = members.filter((m) => onlineUsers.includes(m._id));
  const offlineMembers = members.filter((m) => !onlineUsers.includes(m._id));

  const SidebarContent = () => (
    <div className="flex flex-col h-full bg-channel-bg lg:bg-[#2b2d31] pt-4 px-2 w-60 shrink-0 custom-scrollbar overflow-y-auto border-l border-divider lg:border-none">
      {onlineMembers.length > 0 && (
        <div className="mb-6">
          <h3 className="text-xs font-bold text-text-muted uppercase tracking-wider px-2 mb-1">
            Online — {onlineMembers.length}
          </h3>
          {onlineMembers.map((m) => (
            <div key={m._id} className="flex items-center px-2 py-1.5 hover:bg-white/5 rounded cursor-pointer group">
              <div className="relative mr-3">
                <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-white font-bold">
                  {m.username.charAt(0).toUpperCase()}
                </div>
                <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-[#23a559] rounded-full border-[2.5px] border-[#2b2d31] group-hover:border-[#33353b] transition-colors"></div>
              </div>
              <div className="flex items-center min-w-0">
                <span className="text-text-normal font-medium truncate opacity-90 group-hover:opacity-100">{m.username}</span>
                {ownerId === m._id && <Crown size={14} className="text-[#faa61a] ml-1.5 shrink-0" />}
              </div>
            </div>
          ))}
        </div>
      )}

      {offlineMembers.length > 0 && (
        <div>
          <h3 className="text-xs font-bold text-text-muted uppercase tracking-wider px-2 mb-1">
            Offline — {offlineMembers.length}
          </h3>
          {offlineMembers.map((m) => (
            <div key={m._id} className="flex items-center px-2 py-1.5 hover:bg-white/5 rounded cursor-pointer group opacity-50 hover:opacity-100 transition-opacity">
              <div className="relative mr-3">
                <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-white font-bold">
                  {m.username.charAt(0).toUpperCase()}
                </div>
                {/* Offline indicator (transparent hollow circle) */}
                <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-transparent rounded-full border-[2.5px] border-[#2b2d31] group-hover:border-[#33353b] transition-colors">
                  <div className="w-full h-full rounded-full border-[2px] border-[#80848e]"></div>
                </div>
              </div>
              <div className="flex items-center min-w-0">
                <span className="text-text-normal font-medium truncate">{m.username}</span>
                {ownerId === m._id && <Crown size={14} className="text-[#faa61a] ml-1.5 shrink-0" />}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <div className="hidden lg:block h-full">
        <SidebarContent />
      </div>

      {/* Mobile Sliding Sheet */}
      {isOpenMobile && (
        <div className="lg:hidden fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-black/50" onClick={onCloseMobile}></div>
          <div className="relative w-60 h-full bg-[#2b2d31] shadow-xl animate-in slide-in-from-right">
            <SidebarContent />
          </div>
        </div>
      )}
    </>
  );
};
