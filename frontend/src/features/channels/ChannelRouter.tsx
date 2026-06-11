import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import { API_BASE_URL } from '../../config';
import { ChatArea } from '../chat/ChatArea';
import { VoiceChannel } from '../rtc/components/VoiceChannel';
import { useVoice } from '../rtc/hooks/useWebRTC';

export const ChannelRouter: React.FC = () => {
  const { channelId, serverId } = useParams<{ channelId: string; serverId: string }>();
  const [channelType, setChannelType] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const { joinVoiceChannel } = useVoice();

  useEffect(() => {
    const fetchChannelInfo = async () => {
      if (!channelId || !serverId) return;
      try {
        setLoading(true);
        const token = localStorage.getItem('token');
        const res = await axios.get(`${API_BASE_URL}/api/channels/${serverId}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.data) {
          const channels = Array.isArray(res.data) ? res.data : (res.data.data || []);
          const channel = channels.find((c: any) => c.id === channelId || c._id === channelId);
          if (channel) {
            setChannelType(channel.type || 'text');
            if (channel.type === 'voice') {
              joinVoiceChannel(channel.id || channel._id);
            }
          } else {
             // Fallback
             setChannelType('text');
          }
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    
    fetchChannelInfo();
  }, [channelId, serverId]);

  if (loading) {
    return <div className="flex-1 bg-background flex items-center justify-center text-white">Loading...</div>;
  }

  if (channelType === 'voice') {
    return <VoiceChannel />;
  }

  return <ChatArea />;
};
