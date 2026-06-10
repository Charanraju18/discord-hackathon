import React from 'react';
import { User, Users, Clock, UserPlus } from 'lucide-react';

interface FriendsSidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  pendingCount?: number;
}

export const FriendsSidebar: React.FC<FriendsSidebarProps> = ({ activeTab, setActiveTab, pendingCount = 0 }) => {
  const tabs = [
    { id: 'online', label: 'Online', icon: <User size={20} /> },
    { id: 'all', label: 'All Friends', icon: <Users size={20} /> },
    { id: 'pending', label: 'Pending', icon: <Clock size={20} />, badge: pendingCount },
    { id: 'add', label: 'Add Friend', icon: <UserPlus size={20} /> },
  ];

  return (
    <div className="flex flex-col w-full bg-channel-bg">
      {/* Header */}
      <div className="h-12 border-b border-divider flex items-center justify-between px-4 font-bold text-white shadow-sm shrink-0">
        <span className="truncate">Friends</span>
      </div>

      {/* Navigation */}
      <div className="py-3 px-2 space-y-[2px]">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`w-full flex items-center justify-between px-2 py-2 rounded transition-colors group ${
              activeTab === tab.id
                ? 'bg-white/10 text-interactive-active'
                : 'text-text-muted hover:bg-white/5 hover:text-interactive-hover'
            }`}
          >
            <div className="flex items-center">
              <span className="mr-3">{tab.icon}</span>
              <span className="font-medium">{tab.label}</span>
            </div>
            {tab.badge ? (
              <span className="bg-[#f23f42] text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full leading-none">
                {tab.badge}
              </span>
            ) : null}
          </button>
        ))}
      </div>
    </div>
  );
};
