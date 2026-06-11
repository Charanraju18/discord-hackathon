import React, { useState, useRef, useEffect } from 'react';
import { Mic, MicOff, Headphones, HeadphoneOff, Settings, LogOut } from 'lucide-react';
import { useAuth } from './AuthContext';

export const UserPanel: React.FC = () => {
  const { user, logout } = useAuth();
  const [muted, setMuted] = useState(false);
  const [deafened, setDeafened] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowSettings(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const iconBtn = 'w-8 h-8 flex items-center justify-center rounded transition-colors hover:bg-white/10';

  return (
    <div className="h-[52px] bg-[#232428] flex items-center px-2 shrink-0 relative">
      {/* Avatar + username */}
      <div className="flex items-center hover:bg-white/10 p-1 rounded cursor-pointer transition-colors flex-1 min-w-0">
        <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-white font-bold mr-2 relative shrink-0">
          {user?.username?.charAt(0).toUpperCase()}
          <div className="absolute bottom-0 right-0 w-3 h-3 bg-[#23a559] rounded-full border-2 border-[#232428]" />
        </div>
        <div className="flex flex-col truncate min-w-0">
          <span className="text-sm font-semibold text-white leading-tight truncate">{user?.username}</span>
          <span className="text-xs text-text-muted leading-tight truncate">Online</span>
        </div>
      </div>

      {/* Controls: Mute | Deafen | Settings */}
      <div className="flex items-center gap-0.5 shrink-0">
        <button
          onClick={() => setMuted(v => !v)}
          title={muted ? 'Unmute' : 'Mute'}
          className={`${iconBtn} ${muted ? 'text-[#f23f42]' : 'text-text-muted hover:text-text-normal'}`}
        >
          {muted ? <MicOff size={20} /> : <Mic size={20} />}
        </button>

        <button
          onClick={() => setDeafened(v => !v)}
          title={deafened ? 'Undeafen' : 'Deafen'}
          className={`${iconBtn} ${deafened ? 'text-[#f23f42]' : 'text-text-muted hover:text-text-normal'}`}
        >
          {deafened ? <HeadphoneOff size={20} /> : <Headphones size={20} />}
        </button>

        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setShowSettings(v => !v)}
            title="User Settings"
            className={`${iconBtn} text-text-muted hover:text-text-normal`}
          >
            <Settings size={20} />
          </button>

          {showSettings && (
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-44 bg-[#1e1f22] rounded shadow-xl border border-divider overflow-hidden z-50">
              <div className="p-1">
                <button
                  onClick={() => { setShowSettings(false); logout(); }}
                  className="w-full flex items-center px-2 py-2 text-sm text-[#f23f42] hover:bg-[#f23f42] hover:text-white rounded transition-colors group"
                >
                  <LogOut size={16} className="mr-2 opacity-80 group-hover:opacity-100" />
                  Log Out
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
