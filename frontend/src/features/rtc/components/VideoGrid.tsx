import React, { useEffect, useRef } from 'react';
import { useVoice } from '../hooks/useWebRTC';
import { useAuth } from '../../auth/AuthContext';
import { MicOff } from 'lucide-react';

export const VideoGrid: React.FC = () => {
  const { participants, remoteStreams, localStream, localState } = useVoice();
  const { user } = useAuth();
  const localVideoRef = useRef<HTMLVideoElement>(null);
  
  // Set local video stream
  useEffect(() => {
    if (localVideoRef.current && localStream) {
      if (localVideoRef.current.srcObject !== localStream) {
        localVideoRef.current.srcObject = localStream;
      }
    }
  }, [localStream, localState.video, localState.screenSharing]);

  const allParticipants = [
    { id: user?.id || 'local', isLocal: true, state: localState },
    ...Object.entries(participants).map(([id, state]) => ({ id, isLocal: false, state }))
  ];

  return (
    <div className="flex-1 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {allParticipants.map((p) => {
        const hasVideo = p.state.video || p.state.screenSharing;
        const stream = p.isLocal ? localStream : remoteStreams[p.id];
        
        return (
          <div key={p.id} className="relative bg-[#2b2d31] rounded-lg overflow-hidden flex items-center justify-center min-h-[200px]">
            {hasVideo && stream ? (
              <VideoPlayer stream={stream} isLocal={p.isLocal} />
            ) : (
              <div className="w-24 h-24 rounded-full bg-[#1e1f22] flex items-center justify-center text-white text-3xl font-bold uppercase">
                {/* Fallback to avatar, assuming username isn't in participants dict directly, maybe just initial */}
                {(p.isLocal ? user?.username : (p.state as any).username)?.[0]?.toUpperCase() ?? '?'}
              </div>
            )}
            
            {/* Overlay Info */}
            <div className="absolute bottom-2 left-2 bg-black/50 text-white text-xs px-2 py-1 rounded flex items-center gap-2">
              <span>{p.isLocal ? user?.username : (p.state.username || 'User')}</span>
              {p.state.muted && <MicOff size={14} className="text-red-400" />}
            </div>
          </div>
        );
      })}
    </div>
  );
};

const VideoPlayer: React.FC<{ stream: MediaStream; isLocal: boolean }> = ({ stream, isLocal }) => {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  return (
    <video
      ref={videoRef}
      autoPlay
      playsInline
      muted={isLocal} // Always mute local video playback to avoid echo
      className={`w-full h-full object-cover ${isLocal ? 'scale-x-[-1]' : ''}`} // mirror local camera
    />
  );
};
