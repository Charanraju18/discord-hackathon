import React from 'react';
import { NavLink } from 'react-router-dom';
import { Users } from 'lucide-react';

export const FriendsSidebar: React.FC = () => {
  return (
    <div className="flex flex-col w-full bg-channel-bg shrink-0">
      {/* Search field — matches Discord "Find or start a conversation" */}
      <div className="px-2 pt-2 pb-1 shrink-0">
        <button className="w-full bg-[#1e1f22] text-text-muted text-sm px-2.5 py-1.5 rounded flex items-center hover:bg-[#111214] transition-colors cursor-text">
          <span className="text-text-muted text-[13px]">Find or start a conversation</span>
        </button>
      </div>

      {/* Nav items */}
      <div className="px-2 py-1 space-y-0.5">
        <NavLink
          to="/channels/@me"
          end
          className={({ isActive }) =>
            `w-full flex items-center px-2 py-2 rounded transition-colors group ${
              isActive
                ? 'bg-white/10 text-interactive-active'
                : 'text-text-muted hover:bg-white/5 hover:text-interactive-hover'
            }`
          }
        >
          <Users size={20} className="mr-3 shrink-0" />
          <span className="font-medium text-sm">Friends</span>
        </NavLink>
      </div>

      {/* Separator before DMs section */}
      <div className="h-px bg-divider mx-2 my-1" />
    </div>
  );
};
