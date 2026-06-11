import React from 'react';
import { Mic, MicOff, Headphones, Video, VideoOff, Monitor, PhoneOff } from 'lucide-react';
import { useVoice } from '../hooks/useWebRTC';

export const MediaControls: React.FC = () => {
  const { 
    localState, 
    toggleMute, 
    toggleDeafen, 
    toggleVideo, 
    toggleScreenShare,
    leaveVoiceChannel
  } = useVoice();

  return (
    <div className="flex items-center justify-center gap-4 py-3 bg-[#2b2d31]">
      <button 
        onClick={toggleVideo}
        className={`p-3 rounded-full flex items-center justify-center transition-colors ${localState.video ? 'bg-[#1e1f22] text-white hover:bg-[#3f4147]' : 'bg-[#1e1f22] text-white hover:bg-[#3f4147]'}`}
        title={localState.video ? "Turn Off Camera" : "Turn On Camera"}
      >
        {localState.video ? <Video size={20} /> : <VideoOff size={20} className="text-red-400" />}
      </button>

      <button 
        onClick={toggleScreenShare}
        className={`p-3 rounded-full flex items-center justify-center transition-colors ${localState.screenSharing ? 'bg-green-500 text-white' : 'bg-[#1e1f22] text-white hover:bg-[#3f4147]'}`}
        title={localState.screenSharing ? "Stop Sharing" : "Share Screen"}
      >
        <Monitor size={20} />
      </button>

      <button 
        onClick={toggleMute}
        className={`p-3 rounded-full flex items-center justify-center transition-colors ${localState.muted ? 'bg-red-500 text-white hover:bg-red-600' : 'bg-[#1e1f22] text-white hover:bg-[#3f4147]'}`}
        title={localState.muted ? "Unmute" : "Mute"}
      >
        {localState.muted ? <MicOff size={20} /> : <Mic size={20} />}
      </button>

      <button 
        onClick={toggleDeafen}
        className={`p-3 rounded-full flex items-center justify-center transition-colors ${localState.deafened ? 'bg-red-500 text-white hover:bg-red-600' : 'bg-[#1e1f22] text-white hover:bg-[#3f4147]'}`}
        title={localState.deafened ? "Undeafen" : "Deafen"}
      >
        <Headphones size={20} className={localState.deafened ? 'line-through' : ''} />
      </button>

      <button 
        onClick={leaveVoiceChannel}
        className="p-3 rounded-full flex items-center justify-center bg-red-500 text-white hover:bg-red-600 transition-colors ml-4"
        title="Disconnect"
      >
        <PhoneOff size={20} />
      </button>
    </div>
  );
};
