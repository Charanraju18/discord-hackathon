import React from 'react';

export const ActiveNowPanel: React.FC = () => {
  return (
    <div className="w-[360px] flex-none bg-background border-l border-divider hidden lg:flex flex-col p-4">
      <h3 className="text-xl font-bold text-white mb-4">Active Now</h3>

      <div className="flex flex-col items-center justify-center mt-10 text-center">
        <div className="w-full max-w-[200px] mb-4">
          <h4 className="text-white font-bold mb-2">It's quiet for now...</h4>
          <p className="text-[14px] text-text-muted">
            When a friend starts an activity - like playing a game or hanging out on voice - we'll show it here!
          </p>
        </div>
      </div>
    </div>
  );
};
