import React from "react";
import { MessageSquare, Trash2, X, Check } from "lucide-react";

interface FriendCardProps {
  user: {
    _id: string;
    username: string;
    status?: string;
  };
  type: "friend" | "incoming" | "outgoing";
  onMessage?: (userId: string) => void;
  onAccept?: (userId: string) => void;
  onReject?: (userId: string) => void;
  onRemove?: (userId: string) => void;
  actionLoading?: boolean;
}

export const FriendCard: React.FC<FriendCardProps> = ({
  user,
  type,
  onMessage,
  onAccept,
  onReject,
  onRemove,
  actionLoading,
}) => {
  return (
    <div className="flex items-center justify-between p-3 hover:bg-white/5 rounded-lg border-t border-divider group transition-colors">
      <div className="flex items-center">
        <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-white font-bold mr-4 relative">
          {user.username.charAt(0).toUpperCase()}
          {type === "friend" && (
            <div
              className={`absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full border-[3px] border-[#313338] ${
                user.status === "online" ? "bg-[#23a559]" : "bg-[#80848e]"
              }`}
            />
          )}
        </div>
        <div className="flex flex-col">
          <span className="font-semibold text-white">{user.username}</span>
          <span className="text-xs text-text-muted">
            {type === "friend"
              ? user.status === "online"
                ? "Online"
                : "Offline"
              : type === "incoming"
                ? "Incoming Friend Request"
                : "Outgoing Friend Request"}
          </span>
        </div>
      </div>

      <div className="flex items-center space-x-2">
        {type === "friend" && (
          <>
            <button
              onClick={() => onMessage && onMessage(user._id)}
              className="w-9 h-9 rounded-full bg-[#2b2d31] flex items-center justify-center text-text-muted hover:text-white transition-colors"
              title="Message"
            >
              <MessageSquare size={18} />
            </button>
            <button
              onClick={() => onRemove && onRemove(user._id)}
              disabled={actionLoading}
              className="w-9 h-9 rounded-full bg-[#2b2d31] flex items-center justify-center text-text-muted hover:text-[#f23f42] transition-colors"
              title="Remove Friend"
            >
              <Trash2 size={18} />
            </button>
          </>
        )}

        {type === "incoming" && (
          <>
            <button
              onClick={() => onAccept && onAccept(user._id)}
              disabled={actionLoading}
              className="w-9 h-9 rounded-full bg-[#2b2d31] flex items-center justify-center text-[#23a559] hover:bg-[#23a559] hover:text-white transition-colors"
              title="Accept"
            >
              <Check size={18} />
            </button>
            <button
              onClick={() => onReject && onReject(user._id)}
              disabled={actionLoading}
              className="w-9 h-9 rounded-full bg-[#2b2d31] flex items-center justify-center text-[#f23f42] hover:bg-[#f23f42] hover:text-white transition-colors"
              title="Ignore"
            >
              <X size={18} />
            </button>
          </>
        )}

        {type === "outgoing" && (
          <button
            onClick={() => onReject && onReject(user._id)}
            disabled={actionLoading}
            className="w-9 h-9 rounded-full bg-[#2b2d31] flex items-center justify-center text-[#f23f42] hover:bg-[#f23f42] hover:text-white transition-colors"
            title="Cancel Request"
          >
            <X size={18} />
          </button>
        )}
      </div>
    </div>
  );
};
