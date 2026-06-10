import React, { useState } from 'react';
import axios from 'axios';
import { X, Copy, Check } from 'lucide-react';

interface InviteModalProps {
  serverId: string;
  serverName: string;
  onClose: () => void;
}

export const InviteModal: React.FC<InviteModalProps> = ({ serverId, serverName, onClose }) => {
  const [inviteCode, setInviteCode] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  const generateInvite = async () => {
    setIsLoading(true);
    setError('');
    try {
      const token = localStorage.getItem('token');
      const res = await axios.post(
        `http://localhost:5000/api/servers/${serverId}/invites`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (res.data.success) {
        setInviteCode(res.data.data.code);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to generate invite link');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = () => {
    if (!inviteCode) return;
    const inviteUrl = `${window.location.origin}/invite/${inviteCode}`;
    navigator.clipboard.writeText(inviteUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="bg-[#313338] w-full max-w-md rounded-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="p-4 border-b border-divider flex items-center justify-between">
          <h2 className="text-xl font-bold text-white">Invite friends to {serverName}</h2>
          <button onClick={onClose} className="text-text-muted hover:text-white transition-colors p-1">
            <X size={24} />
          </button>
        </div>

        <div className="p-6">
          {!inviteCode && !isLoading && (
            <div className="text-center">
              <p className="text-text-muted mb-6">Generate a new invite link to bring friends into your server.</p>
              <button
                onClick={generateInvite}
                className="w-full bg-primary hover:bg-primary-hover text-white font-medium py-2.5 rounded transition-colors"
              >
                Generate Invite Link
              </button>
            </div>
          )}

          {isLoading && (
            <div className="flex justify-center py-8">
              <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
            </div>
          )}

          {error && (
            <div className="bg-red-500/10 border border-red-500/50 text-red-500 p-3 rounded mb-4 text-sm text-center">
              {error}
            </div>
          )}

          {inviteCode && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-text-muted uppercase mb-2">
                  Send a server invite link to a friend
                </label>
                <div className="flex items-center bg-[#1e1f22] rounded p-1 pr-1.5">
                  <input
                    type="text"
                    readOnly
                    value={`${window.location.origin}/invite/${inviteCode}`}
                    className="flex-1 bg-transparent text-text-normal p-2 outline-none text-sm"
                  />
                  <button
                    onClick={handleCopy}
                    className={`flex items-center px-4 py-1.5 rounded text-sm font-medium transition-colors ${
                      copied ? 'bg-[#23a559] text-white' : 'bg-primary hover:bg-primary-hover text-white'
                    }`}
                  >
                    {copied ? <Check size={16} className="mr-1" /> : <Copy size={16} className="mr-1" />}
                    {copied ? 'Copied' : 'Copy'}
                  </button>
                </div>
              </div>
              <p className="text-xs text-text-muted">
                Your invite link will expire in 7 days.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
