import React from 'react';

interface ReactionBadgeProps {
  emoji: string;
  count: number;
  hasReacted: boolean;
  users: string[]; // usernames or userIds to show on hover
  onClick: () => void;
}

export const ReactionBadge: React.FC<ReactionBadgeProps> = ({ emoji, count, hasReacted, users, onClick }) => {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 px-2 py-0.5 rounded-md border text-xs transition-colors group relative ${
        hasReacted 
          ? 'bg-blue-500/20 border-blue-500/50 text-blue-400 hover:bg-blue-500/30 hover:border-blue-500' 
          : 'bg-[#2b2d31] border-transparent text-text-muted hover:bg-[#313338] hover:border-divider hover:text-text-normal'
      }`}
    >
      <span className="text-[14px]">{emoji}</span>
      <span className="font-medium">{count}</span>

      {/* Tooltip on hover */}
      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-black rounded shadow-lg text-white text-xs opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity min-w-max z-50">
        <div className="font-semibold mb-1">{emoji}</div>
        <div className="flex flex-wrap gap-1 items-center">
          {users.slice(0, 5).map((u: any, idx) => (
            <React.Fragment key={typeof u === 'string' ? u : u.id}>
              {idx > 0 && <span>•</span>}
              <span>{typeof u === 'string' ? u : u.username}</span>
            </React.Fragment>
          ))}
          {users.length > 5 && <span>and {users.length - 5} others</span>}
        </div>
        <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-black"></div>
      </div>
    </button>
  );
};
