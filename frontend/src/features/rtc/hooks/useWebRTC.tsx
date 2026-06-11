import React, { createContext, useContext, useEffect, useState, useRef, useCallback } from 'react';
import { useSocket } from '../../socket/SocketContext';
import { useAuth } from '../../auth/AuthContext';
import { rtcConfig } from '../config';
import type { VoiceParticipantState, VoiceRoomState } from '../types';

interface VoiceContextType {
  currentVoiceChannelId: string | null;
  participants: Record<string, VoiceParticipantState>;
  joinVoiceChannel: (channelId: string) => void;
  leaveVoiceChannel: () => void;
  toggleMute: () => void;
  toggleDeafen: () => void;
  toggleVideo: () => void;
  toggleScreenShare: () => void;
  localState: VoiceParticipantState;
  remoteStreams: Record<string, MediaStream>;
  localStream: MediaStream | null;
}

const VoiceContext = createContext<VoiceContextType | undefined>(undefined);

export const VoiceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { socket, isConnected } = useSocket();
  const { user } = useAuth();
  
  const [currentVoiceChannelId, setCurrentVoiceChannelId] = useState<string | null>(null);
  const [participants, setParticipants] = useState<Record<string, VoiceParticipantState>>({});
  const [remoteStreams, setRemoteStreams] = useState<Record<string, MediaStream>>({});
  
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  
  const [localState, setLocalState] = useState<VoiceParticipantState>({
    muted: false,
    deafened: false,
    video: false,
    screenSharing: false,
    sid: '',
  });

  const peerConnections = useRef<Record<string, RTCPeerConnection>>({});

  // Helper to sync local state to socket
  const updateLocalState = useCallback((updates: Partial<VoiceParticipantState>) => {
    if (!socket || !currentVoiceChannelId) return;
    setLocalState(prev => {
      const next = { ...prev, ...updates };
      socket.emit('update_voice_state', { channelId: currentVoiceChannelId, updates });
      return next;
    });
  }, [socket, currentVoiceChannelId]);

  // Clean up all peer connections
  const cleanupRTC = useCallback(() => {
    Object.values(peerConnections.current).forEach(pc => pc.close());
    peerConnections.current = {};
    setRemoteStreams({});
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop());
      localStreamRef.current = null;
      setLocalStream(null);
    }
  }, [localStream]);

  // Reconnection recovery
  useEffect(() => {
    if (isConnected && currentVoiceChannelId && socket) {
      socket.emit('join_voice_channel', currentVoiceChannelId);
    }
  }, [isConnected, currentVoiceChannelId, socket]);

  useEffect(() => {
    if (!socket || !user) return;

    socket.on('voice_room_state', (state: VoiceRoomState) => {
      console.log('socket event: voice_room_state', state);
      
      const remoteParticipants = { ...state.participants };
      if (user.id in remoteParticipants) {
        delete remoteParticipants[user.id];
      }
      
      setParticipants(remoteParticipants);
      setCurrentVoiceChannelId(state.channelId);
      
      // If we joined, we need to create peer connections offering to all existing participants
      Object.keys(remoteParticipants).forEach(async (participantId) => {
        createPeerConnection(participantId, true);
      });
    });

    socket.on('user_joined_voice', async ({ userId, channelId, state }) => {
      console.log('socket event: user_joined_voice', { userId, channelId, state });
      if (channelId !== currentVoiceChannelId || userId === user.id) return;
      setParticipants(prev => ({ ...prev, [userId]: state }));
    });

    socket.on('user_left_voice', ({ userId, channelId }) => {
      console.log('socket event: user_left_voice', { userId, channelId });
      if (channelId !== currentVoiceChannelId) return;
      setParticipants(prev => {
        const next = { ...prev };
        delete next[userId];
        return next;
      });
      
      if (peerConnections.current[userId]) {
        peerConnections.current[userId].close();
        delete peerConnections.current[userId];
      }
      setRemoteStreams(prev => {
        const next = { ...prev };
        delete next[userId];
        return next;
      });
    });

    socket.on('voice_state_updated', ({ userId, channelId, state }) => {
      if (channelId !== currentVoiceChannelId) return;
      setParticipants(prev => ({ ...prev, [userId]: state }));
    });

    // WebRTC Signaling
    const handleOffer = async ({ senderId, offer }: any) => {
      console.log('socket event: offer from', senderId);
      const pc = createPeerConnection(senderId, false);
      await pc.setRemoteDescription(new RTCSessionDescription(offer));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      socket.emit('answer', { targetUserId: senderId, answer });
    };

    const handleAnswer = async ({ senderId, answer }: any) => {
      console.log('socket event: answer from', senderId);
      const pc = peerConnections.current[senderId];
      if (pc) {
        await pc.setRemoteDescription(new RTCSessionDescription(answer));
      }
    };

    const handleIceCandidate = async ({ senderId, candidate }: any) => {
      console.log('socket event: ice_candidate from', senderId);
      const pc = peerConnections.current[senderId];
      if (pc && candidate) {
        await pc.addIceCandidate(new RTCIceCandidate(candidate));
      }
    };

    socket.on('offer', handleOffer);
    socket.on('answer', handleAnswer);
    socket.on('ice_candidate', handleIceCandidate);

    return () => {
      socket.off('voice_room_state');
      socket.off('user_joined_voice');
      socket.off('user_left_voice');
      socket.off('voice_state_updated');
      socket.off('offer', handleOffer);
      socket.off('answer', handleAnswer);
      socket.off('ice_candidate', handleIceCandidate);
    };
  }, [socket, user, currentVoiceChannelId]);

  const createPeerConnection = (targetUserId: string, isInitiator: boolean) => {
    if (peerConnections.current[targetUserId]) {
      return peerConnections.current[targetUserId];
    }

    const pc = new RTCPeerConnection(rtcConfig);
    peerConnections.current[targetUserId] = pc;

    pc.onicecandidate = (event) => {
      if (event.candidate && socket) {
        socket.emit('ice_candidate', { targetUserId, candidate: event.candidate });
      }
    };

    pc.ontrack = (event) => {
      setRemoteStreams(prev => ({
        ...prev,
        [targetUserId]: event.streams[0]
      }));
    };

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => {
        pc.addTrack(track, localStreamRef.current!);
      });
    }

    if (isInitiator) {
      pc.createOffer()
        .then(offer => pc.setLocalDescription(offer))
        .then(() => {
          socket?.emit('offer', { targetUserId, offer: pc.localDescription });
        });
    }

    return pc;
  };

  const getMediaStream = async (video: boolean = false) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video });
      setLocalStream(stream);
      localStreamRef.current = stream;
      
      // Apply current mute state
      stream.getAudioTracks().forEach(track => {
        track.enabled = !localState.muted;
      });

      return stream;
    } catch (err) {
      console.error("Failed to get local stream", err);
      return null;
    }
  };

  const joinVoiceChannel = async (channelId: string) => {
    if (currentVoiceChannelId === channelId) return;
    if (currentVoiceChannelId) {
      leaveVoiceChannel();
    }
    
    await getMediaStream(localState.video);
    if (socket) {
      console.log('socket emit: join_voice_channel', channelId);
      socket.emit('join_voice_channel', channelId);
    }
  };

  const leaveVoiceChannel = useCallback(() => {
    if (socket && currentVoiceChannelId) {
      socket.emit('leave_voice_channel', currentVoiceChannelId);
    }
    setCurrentVoiceChannelId(null);
    setParticipants({});
    cleanupRTC();
  }, [socket, currentVoiceChannelId, cleanupRTC]);

  const toggleMute = () => {
    if (localStream) {
      const newMuted = !localState.muted;
      localStream.getAudioTracks().forEach(t => t.enabled = !newMuted);
      updateLocalState({ muted: newMuted });
    }
  };

  const toggleDeafen = () => {
    updateLocalState({ deafened: !localState.deafened });
    // The actual muting of incoming audio is handled in the VoiceChannel component via the `deafened` state
  };

  const toggleVideo = async () => {
    const newVideoState = !localState.video;
    
    if (newVideoState) {
      // Need to request camera
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      // Replace tracks
      const videoTrack = stream.getVideoTracks()[0];
      if (localStreamRef.current) {
        localStreamRef.current.addTrack(videoTrack);
        Object.entries(peerConnections.current).forEach(async ([targetUserId, pc]) => {
          const sender = pc.getSenders().find(s => s.track?.kind === 'video');
          if (sender) {
            sender.replaceTrack(videoTrack);
          } else {
            pc.addTrack(videoTrack, localStreamRef.current!);
            try {
              const offer = await pc.createOffer();
              await pc.setLocalDescription(offer);
              socket?.emit('offer', { targetUserId, offer: pc.localDescription });
            } catch (err) {
              console.error('Error renegotiating video:', err);
            }
          }
        });
      }
    } else {
      if (localStreamRef.current) {
        localStreamRef.current.getVideoTracks().forEach(track => {
          track.stop();
          localStreamRef.current!.removeTrack(track);
        });
      }
    }
    
    updateLocalState({ video: newVideoState });
  };

  const toggleScreenShare = async () => {
    // Screen sharing implementation for Phase 4
    if (!localState.screenSharing) {
      try {
        const stream = await navigator.mediaDevices.getDisplayMedia({ video: true });
        const videoTrack = stream.getVideoTracks()[0];
        
        videoTrack.onended = () => {
          toggleScreenShare(); // Toggle back off
        };

        if (localStreamRef.current) {
          Object.entries(peerConnections.current).forEach(async ([targetUserId, pc]) => {
            const sender = pc.getSenders().find(s => s.track?.kind === 'video');
            if (sender) {
              sender.replaceTrack(videoTrack);
            } else {
              pc.addTrack(videoTrack, localStreamRef.current!);
              try {
                const offer = await pc.createOffer();
                await pc.setLocalDescription(offer);
                socket?.emit('offer', { targetUserId, offer: pc.localDescription });
              } catch (err) {
                console.error('Error renegotiating screen share:', err);
              }
            }
          });
        }
        updateLocalState({ screenSharing: true });
      } catch (err) {
        console.error("Failed to share screen", err);
      }
    } else {
      // Stop screen sharing and revert to camera if video was enabled
      if (localState.video) {
        toggleVideo(); // restart camera
      } else {
        Object.values(peerConnections.current).forEach(pc => {
           const sender = pc.getSenders().find(s => s.track?.kind === 'video');
           if (sender && localStreamRef.current) {
              // We need to revert to nothing or camera
              if (localStreamRef.current.getVideoTracks().length > 0) {
                 sender.replaceTrack(localStreamRef.current.getVideoTracks()[0]);
              }
           }
        });
      }
      updateLocalState({ screenSharing: false });
    }
  };

  return (
    <VoiceContext.Provider value={{
      currentVoiceChannelId,
      participants,
      joinVoiceChannel,
      leaveVoiceChannel,
      toggleMute,
      toggleDeafen,
      toggleVideo,
      toggleScreenShare,
      localState,
      remoteStreams,
      localStream
    }}>
      {children}
    </VoiceContext.Provider>
  );
};

export const useVoice = () => {
  const context = useContext(VoiceContext);
  if (context === undefined) {
    throw new Error('useVoice must be used within a VoiceProvider');
  }
  return context;
};
