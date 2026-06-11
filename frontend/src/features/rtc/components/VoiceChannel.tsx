import React, { useEffect, useRef } from 'react';
import { useVoice } from '../hooks/useWebRTC';
import { VideoGrid } from './VideoGrid';
import { MediaControls } from './MediaControls';

interface VoiceChannelProps {
  channelId: string;
}

export const VoiceChannel: React.FC<VoiceChannelProps> = ({ channelId }) => {
  const {
    currentVoiceChannelId,
    localState,
    remoteStreams,
    joinVoiceChannel,
  } = useVoice();

  const audioRefs = useRef<Record<string, HTMLAudioElement>>({});

  useEffect(() => {
    Object.keys(remoteStreams).forEach(userId => {
      const stream = remoteStreams[userId];
      const audioEl = audioRefs.current[userId];
      if (audioEl && stream && audioEl.srcObject !== stream) {
        audioEl.srcObject = stream;
      }
    });
  }, [remoteStreams]);

  // Not connected: show rejoin UI instead of blank screen
  if (!currentVoiceChannelId) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-4 bg-server-bg h-full w-full">
        <p className="text-text-muted text-sm">You are not connected to voice.</p>
        <button
          onClick={() => joinVoiceChannel(channelId)}
          className="px-6 py-2 bg-[#23a559] hover:bg-[#1a9147] text-white rounded font-semibold transition-colors"
        >
          Join Voice
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full w-full bg-server-bg">
      {/* Hidden audio elements for remote streams */}
      {Object.keys(remoteStreams).map(userId => (
        <audio
          key={userId}
          ref={el => { if (el) audioRefs.current[userId] = el; }}
          autoPlay
          muted={localState.deafened}
        />
      ))}

      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4 relative">
        <h2 className="text-white font-bold text-lg mb-2">Voice Channel</h2>
        <VideoGrid />
      </div>

      <div className="mt-auto border-t border-[#2b2d31]">
        <MediaControls />
      </div>
    </div>
  );
};
