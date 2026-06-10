import React from 'react';
import { Settings } from 'lucide-react';
import { useAuth } from './AuthContext';
import { NotificationCenter } from '../notifications/NotificationCenter';

export const UserPanel: React.FC = () => {
  const { user } = useAuth();

  return (
    <div className="h-[52px] bg-[#232428] flex items-center px-2 shrink-0">
      <div className="flex items-center hover:bg-white/10 p-1 rounded cursor-pointer transition-colors flex-1 min-w-0">
        <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-white font-bold mr-2 relative shrink-0">
          {user?.username?.charAt(0).toUpperCase()}
          <div className="absolute bottom-0 right-0 w-3 h-3 bg-[#23a559] rounded-full border-2 border-[#232428]"></div>
        </div>
        <div className="flex flex-col truncate min-w-0">
          <span className="text-sm font-bold text-white leading-tight truncate">{user?.username}</span>
          <span className="text-xs text-text-muted leading-tight truncate">Online</span>
        </div>
      </div>
      <div className="flex items-center space-x-1 shrink-0">
        <NotificationCenter />
        <button className="w-8 h-8 flex items-center justify-center text-text-muted hover:text-text-normal hover:bg-white/10 rounded transition-colors">
          <Settings size={20} />
        </button>
      </div>
    </div>
  );
};
