import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useRef,
  useCallback,
} from "react";
import { useSocket } from "../../socket/SocketContext";
import { useAuth } from "../../auth/AuthContext";
import { rtcConfig } from "../config";
import type { VoiceParticipantState, VoiceRoomState } from "../types";

interface VoiceContextType {
  currentVoiceChannelId: string | null;
  participants: Record<string, VoiceParticipantState>;
  joinVoiceChannel: (channelId: string) => Promise<void>;
  leaveVoiceChannel: () => void;
  toggleMute: () => void;
  toggleDeafen: () => void;
  toggleVideo: () => Promise<void>;
  toggleScreenShare: () => Promise<void>;
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
  const [localState, setLocalState] = useState<VoiceParticipantState>({
    muted: false, deafened: false, video: false, screenSharing: false, sid: "",
  });

  // ── Stable refs ─────────────────────────────────────────────────────────────
  // All callbacks and socket handlers read from these, never from closure-captured state.
  const localStreamRef = useRef<MediaStream | null>(null);
  const peerConnectionsRef = useRef<Record<string, RTCPeerConnection>>({});
  const currentChannelRef = useRef<string | null>(null);    // mirrors currentVoiceChannelId
  const localStateRef = useRef(localState);                  // mirrors localState
  const socketRef = useRef(socket);
  const userRef = useRef(user);
  const pendingJoinRef = useRef<string | null>(null);         // join queued while socket not ready

  useEffect(() => { socketRef.current = socket; }, [socket]);
  useEffect(() => { userRef.current = user; }, [user]);
  useEffect(() => { localStateRef.current = localState; }, [localState]);
  // NOTE: currentChannelRef is updated immediately inside leaveVoiceChannel so
  // handlers always see the correct value without waiting for React to flush.

  // ── Emit local state update to backend ──────────────────────────────────────
  const emitStateUpdate = useCallback((updates: Partial<VoiceParticipantState>) => {
    if (socketRef.current && currentChannelRef.current) {
      socketRef.current.emit("update_voice_state", {
        channelId: currentChannelRef.current,
        updates,
      });
    }
  }, []);

  // ── Close and clear ALL WebRTC resources ─────────────────────────────────────
  // Deps: [] — accesses only refs, never state. This makes leaveVoiceChannel stable.
  const cleanupRTC = useCallback(() => {
    Object.values(peerConnectionsRef.current).forEach(pc => {
      pc.ontrack = null;
      pc.onicecandidate = null;
      pc.close();
    });
    peerConnectionsRef.current = {};
    setRemoteStreams({});

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(t => t.stop());
      localStreamRef.current = null;
      setLocalStream(null);
    }
  }, []);

  // ── Create (or return existing) RTCPeerConnection ────────────────────────────
  // Deps: [] — uses refs and stable socketRef only.
  const createPeerConnection = useCallback((targetUserId: string, isInitiator: boolean): RTCPeerConnection => {
    const existing = peerConnectionsRef.current[targetUserId];
    if (existing && existing.signalingState !== "closed") return existing;

    // Close stale closed connection if present
    if (existing) existing.close();

    const pc = new RTCPeerConnection(rtcConfig);
    peerConnectionsRef.current[targetUserId] = pc;

    pc.onicecandidate = (event) => {
      if (event.candidate && socketRef.current) {
        socketRef.current.emit("ice_candidate", { targetUserId, candidate: event.candidate });
      }
    };

    pc.ontrack = (event) => {
      setRemoteStreams(prev => ({ ...prev, [targetUserId]: event.streams[0] }));
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
          socketRef.current?.emit("offer", { targetUserId, offer: pc.localDescription });
        })
        .catch(err => console.error("createOffer error:", err));
    }

    return pc;
  }, []);

  // ── Get microphone (and optionally camera) stream ───────────────────────────
  // Stops any existing tracks first so the OS releases the device before re-acquiring.
  const getMediaStream = useCallback(async (video = false): Promise<MediaStream | null> => {
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(t => t.stop());
      localStreamRef.current = null;
      setLocalStream(null);
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video });
      localStreamRef.current = stream;
      setLocalStream(stream);
      // Apply current mute state immediately
      stream.getAudioTracks().forEach(t => { t.enabled = !localStateRef.current.muted; });
      return stream;
    } catch (err) {
      console.error("getUserMedia failed:", err);
      return null;
    }
  }, []);

  // ── Socket event handlers ─────────────────────────────────────────────────────
  // Registered once per socket/user change. All channel comparisons use the ref
  // so they never go stale even if React hasn't flushed the state update yet.
  useEffect(() => {
    if (!socket || !user) return;

    const handleVoiceRoomState = (state: VoiceRoomState) => {
      const remote = { ...state.participants };
      delete remote[user.id];
      setParticipants(remote);
      currentChannelRef.current = state.channelId;
      setCurrentVoiceChannelId(state.channelId);
      Object.keys(remote).forEach(pid => createPeerConnection(pid, true));
    };

    const handleUserJoined = ({ userId, channelId, state }: any) => {
      if (channelId !== currentChannelRef.current || userId === user.id) return;
      setParticipants(prev => ({ ...prev, [userId]: state }));
    };

    const handleUserLeft = ({ userId, channelId }: any) => {
      if (channelId !== currentChannelRef.current) return;
      setParticipants(prev => { const n = { ...prev }; delete n[userId]; return n; });
      const pc = peerConnectionsRef.current[userId];
      if (pc) { pc.close(); delete peerConnectionsRef.current[userId]; }
      setRemoteStreams(prev => { const n = { ...prev }; delete n[userId]; return n; });
    };

    const handleVoiceStateUpdated = ({ userId, channelId, state }: any) => {
      if (channelId !== currentChannelRef.current || userId === user.id) return;
      setParticipants(prev => ({ ...prev, [userId]: state }));
    };

    const handleOffer = async ({ senderId, offer }: any) => {
      const pc = createPeerConnection(senderId, false);
      try {
        await pc.setRemoteDescription(new RTCSessionDescription(offer));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        socketRef.current?.emit("answer", { targetUserId: senderId, answer });
      } catch (err) { console.error("handleOffer error:", err); }
    };

    const handleAnswer = async ({ senderId, answer }: any) => {
      const pc = peerConnectionsRef.current[senderId];
      if (pc) {
        try { await pc.setRemoteDescription(new RTCSessionDescription(answer)); }
        catch (err) { console.error("handleAnswer error:", err); }
      }
    };

    const handleIce = async ({ senderId, candidate }: any) => {
      const pc = peerConnectionsRef.current[senderId];
      if (pc && candidate) {
        try { await pc.addIceCandidate(new RTCIceCandidate(candidate)); }
        catch (err) { console.error("addIceCandidate error:", err); }
      }
    };

    socket.on("voice_room_state", handleVoiceRoomState);
    socket.on("user_joined_voice", handleUserJoined);
    socket.on("user_left_voice", handleUserLeft);
    socket.on("voice_state_updated", handleVoiceStateUpdated);
    socket.on("offer", handleOffer);
    socket.on("answer", handleAnswer);
    socket.on("ice_candidate", handleIce);

    return () => {
      // Use specific handler references so we don't remove other listeners
      socket.off("voice_room_state", handleVoiceRoomState);
      socket.off("user_joined_voice", handleUserJoined);
      socket.off("user_left_voice", handleUserLeft);
      socket.off("voice_state_updated", handleVoiceStateUpdated);
      socket.off("offer", handleOffer);
      socket.off("answer", handleAnswer);
      socket.off("ice_candidate", handleIce);
    };
  }, [socket, user, createPeerConnection]); // NOT currentVoiceChannelId

  // ── Reconnect recovery + pending join ────────────────────────────────────────
  useEffect(() => {
    if (!isConnected || !socket) return;

    // Re-join if we were in a channel before the disconnect
    if (currentChannelRef.current) {
      socket.emit("join_voice_channel", currentChannelRef.current);
      return;
    }

    // Execute any join that was queued while socket was not yet ready
    if (pendingJoinRef.current) {
      const channelId = pendingJoinRef.current;
      pendingJoinRef.current = null;
      socket.emit("join_voice_channel", channelId);
    }
  }, [isConnected, socket]);

  // ── Leave voice channel ──────────────────────────────────────────────────────
  const leaveVoiceChannel = useCallback(() => {
    const channelId = currentChannelRef.current;
    if (socketRef.current && channelId) {
      socketRef.current.emit("leave_voice_channel", channelId);
    }
    // Update ref immediately — handlers and the next joinVoiceChannel call will
    // see the new value without waiting for React to flush the state update.
    currentChannelRef.current = null;
    pendingJoinRef.current = null;

    setCurrentVoiceChannelId(null);
    setParticipants({});
    setLocalState({ muted: false, deafened: false, video: false, screenSharing: false, sid: "" });
    cleanupRTC();
  }, [cleanupRTC]); // stable: no state deps

  // ── Join voice channel ────────────────────────────────────────────────────────
  const joinVoiceChannel = useCallback(async (channelId: string) => {
    // Guard: already in this exact channel
    if (currentChannelRef.current === channelId) return;

    // Leave current channel cleanly first
    if (currentChannelRef.current) {
      leaveVoiceChannel();
    }

    // Acquire fresh media stream (stops any stale tracks from previous session)
    const stream = await getMediaStream(localStateRef.current.video);
    if (!stream) {
      console.warn("Voice join aborted: could not acquire media");
      return;
    }

    if (socketRef.current && isConnected) {
      socketRef.current.emit("join_voice_channel", channelId);
    } else {
      // Socket not ready yet; the reconnect effect will fire the join once connected
      pendingJoinRef.current = channelId;
    }
  }, [isConnected, leaveVoiceChannel, getMediaStream]);

  // ── Toggle helpers (all stable, read state from refs) ────────────────────────
  const toggleMute = useCallback(() => {
    setLocalState(prev => {
      const muted = !prev.muted;
      localStreamRef.current?.getAudioTracks().forEach(t => { t.enabled = !muted; });
      emitStateUpdate({ muted });
      return { ...prev, muted };
    });
  }, [emitStateUpdate]);

  const toggleDeafen = useCallback(() => {
    setLocalState(prev => {
      const deafened = !prev.deafened;
      emitStateUpdate({ deafened });
      return { ...prev, deafened };
    });
  }, [emitStateUpdate]);

  const toggleVideo = useCallback(async () => {
    const newVideoState = !localStateRef.current.video;
    if (newVideoState) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        const videoTrack = stream.getVideoTracks()[0];
        if (localStreamRef.current) {
          localStreamRef.current.addTrack(videoTrack);
          for (const [targetUserId, pc] of Object.entries(peerConnectionsRef.current)) {
            const sender = pc.getSenders().find(s => s.track?.kind === "video");
            try {
              if (sender) {
                await sender.replaceTrack(videoTrack);
              } else {
                pc.addTrack(videoTrack, localStreamRef.current!);
                const offer = await pc.createOffer();
                await pc.setLocalDescription(offer);
                socketRef.current?.emit("offer", { targetUserId, offer: pc.localDescription });
              }
            } catch (err) { console.error("Video renegotiation error:", err); }
          }
        }
      } catch (err) { console.error("Failed to get video:", err); return; }
    } else {
      localStreamRef.current?.getVideoTracks().forEach(t => {
        t.stop();
        localStreamRef.current!.removeTrack(t);
      });
    }
    emitStateUpdate({ video: newVideoState });
    setLocalState(prev => ({ ...prev, video: newVideoState }));
  }, [emitStateUpdate]);

  const toggleScreenShare = useCallback(async () => {
    const current = localStateRef.current;
    if (!current.screenSharing) {
      try {
        const stream = await navigator.mediaDevices.getDisplayMedia({ video: true });
        const videoTrack = stream.getVideoTracks()[0];
        videoTrack.onended = () => toggleScreenShare();
        if (localStreamRef.current) {
          for (const [targetUserId, pc] of Object.entries(peerConnectionsRef.current)) {
            const sender = pc.getSenders().find(s => s.track?.kind === "video");
            try {
              if (sender) {
                await sender.replaceTrack(videoTrack);
              } else {
                pc.addTrack(videoTrack, localStreamRef.current!);
                const offer = await pc.createOffer();
                await pc.setLocalDescription(offer);
                socketRef.current?.emit("offer", { targetUserId, offer: pc.localDescription });
              }
            } catch (err) { console.error("Screen share renegotiation error:", err); }
          }
        }
        emitStateUpdate({ screenSharing: true });
        setLocalState(prev => ({ ...prev, screenSharing: true }));
      } catch (err) { console.error("Screen share failed:", err); }
    } else {
      if (current.video) await toggleVideo();
      emitStateUpdate({ screenSharing: false });
      setLocalState(prev => ({ ...prev, screenSharing: false }));
    }
  }, [emitStateUpdate, toggleVideo]);

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
      localStream,
    }}>
      {children}
    </VoiceContext.Provider>
  );
};

export const useVoice = () => {
  const ctx = useContext(VoiceContext);
  if (!ctx) throw new Error("useVoice must be used within a VoiceProvider");
  return ctx;
};
