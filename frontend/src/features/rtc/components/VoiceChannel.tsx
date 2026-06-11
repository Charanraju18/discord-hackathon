import React, { useEffect, useRef } from 'react';
import { Mic, MicOff, Headphones, Video, Monitor, PhoneOff } from 'lucide-react';
import { useVoice } from '../hooks/useWebRTC';
import { VideoGrid } from './VideoGrid';
import { MediaControls } from './MediaControls';

export const VoiceChannel: React.FC = () => {
  const { 
    currentVoiceChannelId, 
    participants, 
    localState, 
    remoteStreams,
    localStream 
  } = useVoice();

  // Create an audio element for each remote stream to play audio
  const audioRefs = useRef<{ [key: string]: HTMLAudioElement }>({});

  useEffect(() => {
    Object.keys(remoteStreams).forEach(userId => {
      const stream = remoteStreams[userId];
      const audioEl = audioRefs.current[userId];
      if (audioEl && stream && audioEl.srcObject !== stream) {
        audioEl.srcObject = stream;
      }
    });
  }, [remoteStreams]);

  if (!currentVoiceChannelId) {
    return null; // Don't render anything if not in a voice channel
  }

  return (
    <div className="flex flex-col h-full w-full bg-[#1e1f22]">
      {/* Hidden audio elements for remote streams */}
      {Object.keys(remoteStreams).map(userId => (
        <audio
          key={userId}
          ref={el => { if (el) audioRefs.current[userId] = el; }}
          autoPlay
          muted={localState.deafened} // If local user is deafened, mute all incoming audio
        />
      ))}

      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4 relative">
        <h2 className="text-white font-bold text-lg mb-2">Voice Channel</h2>
        
        {/* Render Video Grid if there are any video streams or just a list of participants */}
        <VideoGrid />
        
      </div>

      {/* Floating Media Controls inside the Voice Channel view or at the bottom */}
      <div className="mt-auto border-t border-[#2b2d31]">
        <MediaControls />
      </div>
    </div>
  );
};
