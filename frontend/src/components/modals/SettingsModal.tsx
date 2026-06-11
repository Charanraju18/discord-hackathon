import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import {
  X,
  User,
  Shield,
  AlertTriangle,
  Heart,
  Palette,
  Lock,
  Cpu,
  Link,
  Bell,
  Edit2,
  Check,
  Eye,
  EyeOff,
  ChevronRight,
  Smartphone,
  Monitor,
  Tablet,
  LogOut,
} from "lucide-react";
import { useAuth } from "../../features/auth/AuthContext";
import { API_BASE_URL } from "../../config";

type Section =
  | "account-info"
  | "password-security"
  | "account-standing"
  | "family-center"
  | "content-social"
  | "data-privacy"
  | "authorized-apps"
  | "connections"
  | "notifications";

interface SettingsModalProps {
  onClose: () => void;
}

// ─── Shared Row component ──────────────────────────────────────────────────────
const Row: React.FC<{
  label: string;
  value: string;
  onEdit?: () => void;
  action?: string;
}> = ({ label, value, onEdit, action = "Edit" }) => (
  <div className="flex items-center justify-between py-3 border-b border-white/5 last:border-0">
    <div className="flex-1 min-w-0">
      <p className="text-xs font-semibold text-text-muted uppercase tracking-wide mb-0.5">
        {label}
      </p>
      <p className="text-white text-sm truncate">{value}</p>
    </div>
    {onEdit && (
      <button
        onClick={onEdit}
        className="ml-4 px-4 py-1.5 bg-[#4e5058] hover:bg-[#6d6f78] text-white text-sm font-medium rounded transition-colors shrink-0"
      >
        {action}
      </button>
    )}
  </div>
);

// ─── Account Info Panel ────────────────────────────────────────────────────────
const AccountInfoPanel: React.FC = () => {
  const { user, login } = useAuth();
  const [editField, setEditField] = useState<"username" | "email" | null>(null);
  const [fieldValue, setFieldValue] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [showEmail, setShowEmail] = useState(false);

  const startEdit = (field: "username" | "email") => {
    setEditField(field);
    setFieldValue(
      field === "username" ? (user?.username ?? "") : (user?.email ?? ""),
    );
    setError("");
  };

  const cancelEdit = () => {
    setEditField(null);
    setError("");
  };

  const saveEdit = async () => {
    if (!fieldValue.trim()) return;
    setSaving(true);
    setError("");
    try {
      const token = localStorage.getItem("token");
      const res = await axios.patch(
        `${API_BASE_URL}/api/users/me`,
        { [editField!]: fieldValue.trim() },
        { headers: { Authorization: `Bearer ${token}` } },
      );
      if (user) login({ ...user, ...res.data });
      setEditField(null);
    } catch (err: any) {
      setError(err?.response?.data?.detail ?? "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const maskedEmail = user?.email
    ? user.email.replace(
        /^(.{3})(.*)(@.*)$/,
        (_, a, b, c) => a + "*".repeat(Math.max(b.length, 4)) + c,
      )
    : "";

  return (
    <div>
      <h2 className="text-xl font-bold text-white mb-6">Account</h2>

      {/* Avatar + username banner */}
      <div className="bg-[#1e1f22] rounded-lg mb-6 overflow-hidden">
        <div className="h-16 bg-linear-to-r from-primary to-[#5865f2]" />
        <div className="px-4 pb-4 -mt-8 flex items-end gap-4">
          <div className="w-16 h-16 rounded-full bg-primary flex items-center justify-center text-white text-2xl font-bold border-4 border-[#1e1f22] shrink-0">
            {user?.username?.charAt(0).toUpperCase()}
          </div>
          <div className="pb-1">
            <p className="text-white font-bold">{user?.username}</p>
            <p className="text-text-muted text-xs">Online</p>
          </div>
        </div>
      </div>

      {/* Account Info section */}
      <div className="bg-[#1e1f22] rounded-lg p-4 mb-4">
        <h3 className="text-xs font-bold text-text-muted uppercase tracking-wide mb-3">
          Account Info
        </h3>

        {editField === "username" ? (
          <div className="py-2">
            <label className="block text-xs font-semibold text-text-muted uppercase mb-2">
              Username
            </label>
            <input
              autoFocus
              value={fieldValue}
              onChange={(e) => setFieldValue(e.target.value)}
              className="w-full bg-[#313338] text-white px-3 py-2 rounded border border-white/10 focus:outline-none focus:border-primary text-sm mb-2"
            />
            {error && <p className="text-[#f23f42] text-xs mb-2">{error}</p>}
            <div className="flex gap-2">
              <button
                onClick={saveEdit}
                disabled={saving}
                className="px-4 py-1.5 bg-primary hover:bg-primary-hover text-white text-sm rounded font-medium transition-colors disabled:opacity-50"
              >
                {saving ? "Saving…" : "Save"}
              </button>
              <button
                onClick={cancelEdit}
                className="px-4 py-1.5 bg-[#4e5058] hover:bg-[#6d6f78] text-white text-sm rounded font-medium transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <Row
            label="Username"
            value={user?.username ?? ""}
            onEdit={() => startEdit("username")}
          />
        )}

        {editField === "email" ? (
          <div className="py-2">
            <label className="block text-xs font-semibold text-text-muted uppercase mb-2">
              Email
            </label>
            <input
              autoFocus
              type="email"
              value={fieldValue}
              onChange={(e) => setFieldValue(e.target.value)}
              className="w-full bg-[#313338] text-white px-3 py-2 rounded border border-white/10 focus:outline-none focus:border-primary text-sm mb-2"
            />
            {error && <p className="text-[#f23f42] text-xs mb-2">{error}</p>}
            <div className="flex gap-2">
              <button
                onClick={saveEdit}
                disabled={saving}
                className="px-4 py-1.5 bg-primary hover:bg-primary-hover text-white text-sm rounded font-medium transition-colors disabled:opacity-50"
              >
                {saving ? "Saving…" : "Save"}
              </button>
              <button
                onClick={cancelEdit}
                className="px-4 py-1.5 bg-[#4e5058] hover:bg-[#6d6f78] text-white text-sm rounded font-medium transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-between py-3 border-b border-white/5">
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-text-muted uppercase tracking-wide mb-0.5">
                Email
              </p>
              <div className="flex items-center gap-2">
                <p className="text-white text-sm">
                  {showEmail ? user?.email : maskedEmail}
                </p>
                <button
                  onClick={() => setShowEmail((v) => !v)}
                  className="text-primary hover:underline text-xs"
                >
                  {showEmail ? "Hide" : "Reveal"}
                </button>
              </div>
            </div>
            <button
              onClick={() => startEdit("email")}
              className="ml-4 px-4 py-1.5 bg-[#4e5058] hover:bg-[#6d6f78] text-white text-sm font-medium rounded transition-colors shrink-0"
            >
              Edit
            </button>
          </div>
        )}

        <Row
          label="Phone Number"
          value="You haven't added a phone number yet."
          action="Add"
        />
      </div>
    </div>
  );
};

// ─── Password & Security Panel ─────────────────────────────────────────────────
const PasswordSecurityPanel: React.FC = () => {
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);

  return (
    <div>
      <h2 className="text-xl font-bold text-white mb-6">Password & Security</h2>

      {/* Password */}
      <div className="bg-[#1e1f22] rounded-lg p-4 mb-4">
        <h3 className="text-xs font-bold text-text-muted uppercase tracking-wide mb-3">
          Password
        </h3>
        {showChangePassword ? (
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-text-muted uppercase mb-1">
                Current Password
              </label>
              <div className="relative">
                <input
                  type={showCurrent ? "text" : "password"}
                  value={currentPw}
                  onChange={(e) => setCurrentPw(e.target.value)}
                  className="w-full bg-[#313338] text-white px-3 py-2 rounded border border-white/10 focus:outline-none focus:border-primary text-sm pr-10"
                />
                <button
                  onClick={() => setShowCurrent((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-white"
                >
                  {showCurrent ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-text-muted uppercase mb-1">
                New Password
              </label>
              <div className="relative">
                <input
                  type={showNew ? "text" : "password"}
                  value={newPw}
                  onChange={(e) => setNewPw(e.target.value)}
                  className="w-full bg-[#313338] text-white px-3 py-2 rounded border border-white/10 focus:outline-none focus:border-primary text-sm pr-10"
                />
                <button
                  onClick={() => setShowNew((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-white"
                >
                  {showNew ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-text-muted uppercase mb-1">
                Confirm New Password
              </label>
              <input
                type="password"
                value={confirmPw}
                onChange={(e) => setConfirmPw(e.target.value)}
                className="w-full bg-[#313338] text-white px-3 py-2 rounded border border-white/10 focus:outline-none focus:border-primary text-sm"
              />
            </div>
            <div className="flex gap-2 pt-1">
              <button className="px-4 py-1.5 bg-primary hover:bg-primary-hover text-white text-sm rounded font-medium transition-colors">
                Save
              </button>
              <button
                onClick={() => setShowChangePassword(false)}
                className="px-4 py-1.5 bg-[#4e5058] hover:bg-[#6d6f78] text-white text-sm rounded font-medium transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-text-muted uppercase tracking-wide mb-0.5">
                Password
              </p>
              <p className="text-white text-sm tracking-widest">••••••••••••</p>
            </div>
            <button
              onClick={() => setShowChangePassword(true)}
              className="px-4 py-1.5 bg-[#4e5058] hover:bg-[#6d6f78] text-white text-sm font-medium rounded transition-colors"
            >
              Edit
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

// ─── Family Center Panel ───────────────────────────────────────────────────────
const FamilyCenterPanel: React.FC = () => (
  <div>
    <h2 className="text-xl font-bold text-white mb-6">Family Center</h2>

    <div className="bg-[#1e1f22] rounded-lg p-4 mb-4">
      <div className="flex items-center gap-3 mb-3">
        <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
          <Heart size={20} className="text-primary" />
        </div>
        <div>
          <p className="text-white font-semibold">Family Center</p>
          <p className="text-text-muted text-xs mt-0.5">
            Tools for parents and guardians to stay connected.
          </p>
        </div>
      </div>
      <p className="text-text-muted text-sm leading-relaxed">
        Family Center lets parents and guardians see their teen's activity
        summary on Discord — the servers they're in, the friends they've added,
        and the apps they use.
      </p>
    </div>

    {[
      {
        title: "Parent Controls",
        desc: "Manage content filters and privacy settings for your teen's account.",
        icon: Shield,
      },
      {
        title: "Connected Accounts",
        desc: "View accounts connected to this Discord profile.",
        icon: Link,
      },
      {
        title: "Activity Visibility",
        desc: "Control what activity information is visible to parents.",
        icon: Eye,
      },
      {
        title: "Safety Settings",
        desc: "Configure safe messaging and content restrictions.",
        icon: Lock,
      },
    ].map(({ title, desc, icon: Icon }) => (
      <div
        key={title}
        className="bg-[#1e1f22] rounded-lg p-4 mb-3 flex items-center justify-between"
      >
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-[#313338] flex items-center justify-center shrink-0">
            <Icon size={18} className="text-text-muted" />
          </div>
          <div>
            <p className="text-white text-sm font-medium">{title}</p>
            <p className="text-text-muted text-xs mt-0.5">{desc}</p>
          </div>
        </div>
        <ChevronRight size={18} className="text-text-muted shrink-0 ml-3" />
      </div>
    ))}
  </div>
);

// ─── Stub panel for other sections ────────────────────────────────────────────
const StubPanel: React.FC<{ title: string; description: string }> = ({
  title,
  description,
}) => (
  <div>
    <h2 className="text-xl font-bold text-white mb-6">{title}</h2>
    <div className="bg-[#1e1f22] rounded-lg p-8 flex flex-col items-center justify-center text-center">
      <Cpu size={48} className="text-text-muted opacity-30 mb-4" />
      <p className="text-white font-semibold mb-1">{title}</p>
      <p className="text-text-muted text-sm">{description}</p>
    </div>
  </div>
);

// ─── Main Modal ────────────────────────────────────────────────────────────────
export const SettingsModal: React.FC<SettingsModalProps> = ({ onClose }) => {
  const { user, logout } = useAuth();
  const [activeSection, setActiveSection] = useState<Section>("account-info");
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [onClose]);

  useEffect(() => {
    contentRef.current?.scrollTo({ top: 0 });
  }, [activeSection]);

  const navSections = [
    {
      groupLabel: "User Settings",
      items: [
        { id: "account-info" as Section, label: "Account Info" },
        { id: "password-security" as Section, label: "Password & Security" },
      ],
    },
  ];

  const renderContent = () => {
    switch (activeSection) {
      case "account-info":
        return <AccountInfoPanel />;
      case "password-security":
        return <PasswordSecurityPanel />;
      case "family-center":
        return <FamilyCenterPanel />;
      case "content-social":
        return (
          <StubPanel
            title="Content & Social"
            description="Manage your content preferences and social features."
          />
        );
      case "data-privacy":
        return (
          <StubPanel
            title="Data & Privacy"
            description="Control how your data is used and stored."
          />
        );
      case "authorized-apps":
        return (
          <StubPanel
            title="Authorized Apps"
            description="Apps and bots that have access to your account."
          />
        );
      case "connections":
        return (
          <StubPanel
            title="Connections"
            description="Connect other accounts and services to Discord."
          />
        );
      case "notifications":
        return (
          <StubPanel
            title="Notifications"
            description="Customize how and when you receive notifications."
          />
        );
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/75 flex z-50"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="flex w-full h-full">
        {/* Left sidebar */}
        <div
          className="w-[232px] min-w-[232px] bg-[#2b2d31] flex flex-col overflow-y-auto pt-14 pb-4 shrink-0 ml-auto"
          style={{ maxWidth: 232 }}
        >
          {/* User info */}
          <div className="px-3 mb-3">
            <div className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-white/5 cursor-pointer transition-colors">
              <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-white font-bold shrink-0">
                {user?.username?.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0">
                <p className="text-white text-sm font-semibold truncate">
                  {user?.username}
                </p>
                <p className="text-text-muted text-xs truncate">Edit Profile</p>
              </div>
            </div>
          </div>

          <div className="h-px bg-white/5 mx-3 mb-2" />

          {navSections.map((section, si) => (
            <div key={si} className="mb-1">
              {section.groupLabel && (
                <p className="px-4 py-1.5 text-[11px] font-bold text-text-muted uppercase tracking-wider">
                  {section.groupLabel}
                </p>
              )}
              {section.items.map((item) => (
                <button
                  key={item.id}
                  onClick={() => setActiveSection(item.id)}
                  className={`w-full text-left px-3 py-1.5 mx-1 rounded text-sm font-medium transition-colors ${
                    activeSection === item.id
                      ? "bg-white/10 text-white"
                      : "text-text-muted hover:bg-white/5 hover:text-interactive-hover"
                  }`}
                  style={{ width: "calc(100% - 8px)" }}
                >
                  {item.label}
                </button>
              ))}
              {si < navSections.length - 1 && (
                <div className="h-px bg-white/5 mx-3 my-2" />
              )}
            </div>
          ))}

          <div className="h-px bg-white/5 mx-3 my-2" />

          <button
            onClick={() => { logout(); onClose(); }}
            className="w-full text-left px-3 py-1.5 mx-1 rounded text-sm font-medium transition-colors text-[#f23f42] hover:bg-[#f23f42]/10 flex items-center gap-2"
            style={{ width: "calc(100% - 8px)" }}
          >
            <LogOut size={16} />
            Log Out
          </button>
        </div>

        {/* Right content area */}
        <div className="flex-1 bg-[#313338] flex min-w-0 relative">
          <div
            ref={contentRef}
            className="flex-1 overflow-y-auto px-10 py-14 custom-scrollbar"
            style={{ maxWidth: 740 }}
          >
            {renderContent()}
          </div>

          {/* Close button */}
          <div className="absolute top-4 right-4 flex flex-col items-center gap-1">
            <button
              onClick={onClose}
              className="w-9 h-9 rounded-full bg-[#4e5058] hover:bg-[#6d6f78] flex items-center justify-center text-white transition-colors"
            >
              <X size={18} />
            </button>
            <span className="text-[10px] text-text-muted font-medium">ESC</span>
          </div>
        </div>
      </div>
    </div>
  );
};
