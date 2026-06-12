export interface VoiceParticipantState {
  muted: boolean;
  deafened: boolean;
  video: boolean;
  screenSharing: boolean;
  sid: string;
  username?: string;
}

export interface VoiceRoomState {
  channelId: string;
  participants: Record<string, VoiceParticipantState>;
}
