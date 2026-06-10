import React from 'react';
import { UserPanel } from '../features/auth/UserPanel';

interface SecondarySidebarLayoutProps {
  children: React.ReactNode;
}

export const SecondarySidebarLayout: React.FC<SecondarySidebarLayoutProps> = ({ children }) => {
  return (
    <div className="w-60 bg-channel-bg flex flex-col h-full shrink-0">
      {/* Dynamic top content (Channels, Friends, etc.) */}
      <div className="flex-1 overflow-y-auto flex flex-col min-h-0">
        {children}
      </div>

      {/* Persistent User Panel at the bottom */}
      <UserPanel />
    </div>
  );
};
