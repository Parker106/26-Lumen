import { useState, useEffect } from "react";
import { motion } from "motion/react";
import { Copy, Plus, Check, Clock, MessageSquare, Calendar, FileText, Settings, LogOut, Users, Trash2, Edit2, X, RefreshCw, CheckCircle, XCircle, AlertCircle } from "lucide-react";
import {
  getAccessCode,
  setAccessCode,
  generateAccessCode,
  getRoutines,
  setRoutines as saveRoutines,
  getMessages,
  clearMessages as clearAllMessages,
  getLogs,
  clearLogs as clearAllLogs,
  getProfiles,
  removeProfile as removeProfileFromStorage,
  getPatientName,
  setPatientName,
  resetAllData,
  approveMessage,
  rejectMessage,
  getPendingMessages,
  getApprovedMessages,
  type Routine,
  type Message,
  type LogEntry,
  type Profile,
} from "../lib/storage";

interface CaretakerDashboardProps {
  onLogout: () => void;
}

export function CaretakerDashboard({ onLogout }: CaretakerDashboardProps) {
  const [activeTab, setActiveTab] = useState<"overview" | "messages" | "routines" | "logs" | "profiles" | "settings">("overview");
  const [copied, setCopied] = useState(false);
  const [showAddRoutine, setShowAddRoutine] = useState(false);
  const [editingRoutine, setEditingRoutine] = useState<string | null>(null);
  const [newRoutineTime, setNewRoutineTime] = useState("");
  const [newRoutineLabel, setNewRoutineLabel] = useState("");
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [confirmRemoveProfile, setConfirmRemoveProfile] = useState<string | null>(null);
  const [confirmClearMessages, setConfirmClearMessages] = useState(false);
  const [confirmClearLogs, setConfirmClearLogs] = useState(false);
  const [confirmRegenCode, setConfirmRegenCode] = useState(false);

  // State from localStorage
  const [patientNameState, setPatientNameState] = useState(getPatientName());
  const [accessCode, setAccessCodeState] = useState(getAccessCode());
  const [messages, setMessages] = useState<Message[]>([]);
  const [pendingMessages, setPendingMessages] = useState<Message[]>([]);
  const [approvedMessages, setApprovedMessages] = useState<Message[]>([]);
  const [routines, setRoutinesState] = useState<Routine[]>([]);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);

  // Load data from localStorage on mount and when tab changes
  useEffect(() => {
    setMessages(getMessages());
    setPendingMessages(getPendingMessages());
    setApprovedMessages(getApprovedMessages());
    setRoutinesState(getRoutines());
    setLogs(getLogs());
    setProfiles(getProfiles());
    setAccessCodeState(getAccessCode());
    setPatientNameState(getPatientName());
  }, [activeTab]);

  const handleCopyCode = () => {
    navigator.clipboard.writeText(accessCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleRegenerateCode = () => {
    const newCode = generateAccessCode();
    setAccessCode(newCode);
    setAccessCodeState(newCode);
    setConfirmRegenCode(false);
  };

  const handleAddRoutine = () => {
    if (newRoutineTime && newRoutineLabel) {
      const newRoutines = [
        ...routines,
        {
          id: Date.now().toString(),
          time: newRoutineTime,
          label: newRoutineLabel,
        },
      ];
      saveRoutines(newRoutines);
      setRoutinesState(newRoutines);
      setNewRoutineTime("");
      setNewRoutineLabel("");
      setShowAddRoutine(false);
    }
  };

  const handleEditRoutine = (id: string) => {
    const routine = routines.find((r) => r.id === id);
    if (routine) {
      setEditingRoutine(id);
      setNewRoutineTime(routine.time);
      setNewRoutineLabel(routine.label);
    }
  };

  const handleUpdateRoutine = () => {
    if (editingRoutine && newRoutineTime && newRoutineLabel) {
      const newRoutines = routines.map((r) =>
        r.id === editingRoutine
          ? { ...r, time: newRoutineTime, label: newRoutineLabel }
          : r
      );
      saveRoutines(newRoutines);
      setRoutinesState(newRoutines);
      setEditingRoutine(null);
      setNewRoutineTime("");
      setNewRoutineLabel("");
    }
  };

  const handleDeleteRoutine = (id: string) => {
    const newRoutines = routines.filter((r) => r.id !== id);
    saveRoutines(newRoutines);
    setRoutinesState(newRoutines);
    setConfirmDelete(null);
  };

  const handleRemoveProfile = (id: string) => {
    removeProfileFromStorage(id);
    setProfiles(getProfiles());
    setConfirmRemoveProfile(null);
  };

  const handleClearMessages = () => {
    clearAllMessages();
    setMessages([]);
    setPendingMessages([]);
    setApprovedMessages([]);
    setConfirmClearMessages(false);
  };

  const handleApproveMessage = (id: string) => {
    approveMessage(id);
    setMessages(getMessages());
    setPendingMessages(getPendingMessages());
    setApprovedMessages(getApprovedMessages());
  };

  const handleRejectMessage = (id: string) => {
    rejectMessage(id);
    setMessages(getMessages());
    setPendingMessages(getPendingMessages());
    setApprovedMessages(getApprovedMessages());
  };

  const handleClearLogs = () => {
    clearAllLogs();
    setLogs([]);
    setConfirmClearLogs(false);
  };

  const handleUpdatePatientName = () => {
    setPatientName(patientNameState);
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const formatRelativeTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays === 1) return "Yesterday";
    return `${diffDays}d ago`;
  };

  const tabs = [
    { id: "overview", label: "Overview", icon: FileText },
    { id: "profiles", label: "Profiles", icon: Users },
    { id: "messages", label: "Messages", icon: MessageSquare },
    { id: "routines", label: "Routines", icon: Calendar },
    { id: "logs", label: "Logs", icon: Clock },
    { id: "settings", label: "Settings", icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0F1220] via-[#121826] to-[#1A1535]">
      {/* Header */}
      <div className="border-b border-border/50 backdrop-blur-xl bg-card/30">
        <div className="max-w-7xl mx-auto px-8 py-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl mb-1">Caretaker Dashboard</h1>
            <p className="text-muted-foreground">Managing care for {patientNameState}</p>
          </div>
          <button
            onClick={onLogout}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/20 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Log Out
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-8 py-8">
        {/* Navigation tabs */}
        <div className="flex gap-2 mb-8 overflow-x-auto pb-2">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 px-5 py-3 rounded-xl transition-all whitespace-nowrap ${
                  activeTab === tab.id
                    ? "bg-accent text-accent-foreground"
                    : "bg-card/50 backdrop-blur-xl border border-border text-muted-foreground hover:text-foreground hover:border-accent/50"
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Overview Tab */}
        {activeTab === "overview" && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="space-y-6"
          >
            {/* Access Code Card */}
            <div className="p-8 rounded-2xl bg-card backdrop-blur-xl border border-border">
              <h2 className="text-xl mb-2">Patient Access Code</h2>
              <p className="text-muted-foreground mb-6">
                Share this code with family and friends, or help {patientNameState} enter it to use Patient Mode
              </p>
              <div className="flex items-center gap-4 flex-wrap">
                <div className="flex-1 min-w-[200px] px-6 py-4 rounded-xl bg-primary/10 border-2 border-primary/30">
                  <p className="text-4xl tracking-wider font-mono">{accessCode}</p>
                </div>
                <button
                  onClick={handleCopyCode}
                  className="px-6 py-4 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 transition-colors flex items-center gap-2"
                >
                  {copied ? (
                    <>
                      <Check className="w-5 h-5" />
                      Copied
                    </>
                  ) : (
                    <>
                      <Copy className="w-5 h-5" />
                      Copy
                    </>
                  )}
                </button>
                {confirmRegenCode ? (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleRegenerateCode}
                      className="px-4 py-3 rounded-xl bg-destructive text-destructive-foreground hover:bg-destructive/90 transition-colors"
                    >
                      Confirm
                    </button>
                    <button
                      onClick={() => setConfirmRegenCode(false)}
                      className="px-4 py-3 rounded-xl bg-muted/20 hover:bg-muted/30 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setConfirmRegenCode(true)}
                    className="px-6 py-4 rounded-xl border border-border text-muted-foreground hover:text-foreground hover:border-primary/50 transition-colors flex items-center gap-2"
                  >
                    <RefreshCw className="w-5 h-5" />
                    New Code
                  </button>
                )}
              </div>
            </div>

            {/* Quick stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="p-6 rounded-2xl bg-card backdrop-blur-xl border border-border hover:border-accent/30 transition-colors">
                <div className="flex items-center gap-3 mb-2">
                  <Users className="w-5 h-5 text-accent" />
                  <p className="text-muted-foreground">Active Profiles</p>
                </div>
                <p className="text-3xl">{profiles.length}</p>
              </div>
              <div className="p-6 rounded-2xl bg-card backdrop-blur-xl border border-border hover:border-secondary/30 transition-colors">
                <div className="flex items-center gap-3 mb-2">
                  <MessageSquare className="w-5 h-5 text-secondary" />
                  <p className="text-muted-foreground">Messages</p>
                </div>
                <p className="text-3xl">{messages.length}</p>
              </div>
              <div className="p-6 rounded-2xl bg-card backdrop-blur-xl border border-border hover:border-primary/30 transition-colors">
                <div className="flex items-center gap-3 mb-2">
                  <Calendar className="w-5 h-5 text-primary" />
                  <p className="text-muted-foreground">Routines</p>
                </div>
                <p className="text-3xl">{routines.length}</p>
              </div>
              <div className="p-6 rounded-2xl bg-card backdrop-blur-xl border border-border hover:border-accent/30 transition-colors">
                <div className="flex items-center gap-3 mb-2">
                  <Clock className="w-5 h-5 text-accent" />
                  <p className="text-muted-foreground">Conversation Logs</p>
                </div>
                <p className="text-3xl">{logs.length}</p>
              </div>
            </div>
          </motion.div>
        )}

        {/* Profiles Tab */}
        {activeTab === "profiles" && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="space-y-4"
          >
            <div className="mb-6">
              <h2 className="text-xl mb-2">Family & Friends Access</h2>
              <p className="text-muted-foreground">
                People who have used the access code to connect with {patientNameState}
              </p>
            </div>

            {profiles.length === 0 ? (
              <div className="p-12 rounded-2xl bg-card backdrop-blur-xl border border-border text-center">
                <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-xl text-muted-foreground">No one has accessed yet</p>
                <p className="text-sm text-muted-foreground/70 mt-2">
                  Share your access code ({accessCode}) with family and friends
                </p>
              </div>
            ) : (
              profiles.map((profile) => (
                <div
                  key={profile.id}
                  className="p-6 rounded-2xl bg-card backdrop-blur-xl border border-border hover:border-border/80 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 rounded-full bg-secondary/20 flex items-center justify-center">
                        <Users className="w-6 h-6 text-secondary" />
                      </div>
                      <div>
                        <p className="font-medium mb-1">{profile.role}</p>
                        <p className="text-xs text-muted-foreground">
                          Last active {formatRelativeTime(profile.lastSeenTimestamp)}
                        </p>
                      </div>
                    </div>
                    <div>
                      {confirmRemoveProfile === profile.id ? (
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleRemoveProfile(profile.id)}
                            className="px-4 py-2 rounded-lg bg-destructive text-destructive-foreground hover:bg-destructive/90 transition-colors text-sm"
                          >
                            Confirm
                          </button>
                          <button
                            onClick={() => setConfirmRemoveProfile(null)}
                            className="px-4 py-2 rounded-lg bg-muted/20 text-foreground hover:bg-muted/30 transition-colors text-sm"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setConfirmRemoveProfile(profile.id)}
                          className="px-4 py-2 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors text-sm"
                        >
                          Remove Access
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </motion.div>
        )}

        {/* Messages Tab */}
        {activeTab === "messages" && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="space-y-6"
          >
            {messages.length > 0 && (
              <div className="flex justify-end mb-4">
                {confirmClearMessages ? (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleClearMessages}
                      className="px-4 py-2 rounded-lg bg-destructive text-destructive-foreground hover:bg-destructive/90 transition-colors text-sm"
                    >
                      Confirm Clear All
                    </button>
                    <button
                      onClick={() => setConfirmClearMessages(false)}
                      className="px-4 py-2 rounded-lg bg-muted/20 hover:bg-muted/30 transition-colors text-sm"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setConfirmClearMessages(true)}
                    className="px-4 py-2 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors text-sm flex items-center gap-2"
                  >
                    <Trash2 className="w-4 h-4" />
                    Clear All Messages
                  </button>
                )}
              </div>
            )}

            {messages.length === 0 ? (
              <div className="p-12 rounded-2xl bg-card backdrop-blur-xl border border-border text-center">
                <MessageSquare className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-xl text-muted-foreground">No messages yet</p>
                <p className="text-sm text-muted-foreground/70 mt-2">
                  Family and friends can send messages through the Family Portal
                </p>
              </div>
            ) : (
              <>
                {/* Pending Messages Section */}
                {pendingMessages.length > 0 && (
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 mb-4">
                      <AlertCircle className="w-5 h-5 text-yellow-500" />
                      <h3 className="text-lg font-medium">Pending Approval ({pendingMessages.length})</h3>
                    </div>
                    {pendingMessages.map((msg) => (
                      <div
                        key={msg.id}
                        className="p-6 rounded-2xl bg-card backdrop-blur-xl border-2 border-yellow-500/30 hover:border-yellow-500/50 transition-colors"
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <p className="font-medium">{msg.fromName}</p>
                            <p className="text-sm text-muted-foreground">{msg.fromRole}</p>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {formatDate(msg.timestamp)} at {formatTime(msg.timestamp)}
                          </p>
                        </div>
                        <p className="text-muted-foreground leading-relaxed mb-4">{msg.text}</p>
                        {msg.location && (
                          <div className="mb-4 p-3 rounded-lg bg-accent/10 border border-accent/20">
                            <p className="text-sm text-accent">
                              📍 Location: {msg.location}
                              {msg.estimatedReturn && ` • Back: ${msg.estimatedReturn}`}
                            </p>
                          </div>
                        )}
                        <div className="flex items-center gap-3">
                          <button
                            onClick={() => handleApproveMessage(msg.id)}
                            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-green-600 text-white hover:bg-green-700 transition-colors text-sm"
                          >
                            <CheckCircle className="w-4 h-4" />
                            Approve
                          </button>
                          <button
                            onClick={() => handleRejectMessage(msg.id)}
                            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-destructive text-destructive-foreground hover:bg-destructive/90 transition-colors text-sm"
                          >
                            <XCircle className="w-4 h-4" />
                            Reject
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Approved Messages Section */}
                {approvedMessages.length > 0 && (
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 mb-4">
                      <CheckCircle className="w-5 h-5 text-green-500" />
                      <h3 className="text-lg font-medium">Approved Messages ({approvedMessages.length})</h3>
                    </div>
                    {approvedMessages.map((msg) => (
                      <div
                        key={msg.id}
                        className="p-6 rounded-2xl bg-card backdrop-blur-xl border border-green-500/20 hover:border-green-500/30 transition-colors"
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <p className="font-medium">{msg.fromName}</p>
                            <p className="text-sm text-muted-foreground">{msg.fromRole}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm text-muted-foreground">
                              {formatDate(msg.timestamp)} at {formatTime(msg.timestamp)}
                            </p>
                            <span className="text-xs text-green-500">✓ Approved</span>
                          </div>
                        </div>
                        <p className="text-muted-foreground leading-relaxed">{msg.text}</p>
                        {msg.location && (
                          <div className="mt-3 p-3 rounded-lg bg-accent/10 border border-accent/20">
                            <p className="text-sm text-accent">
                              📍 Location: {msg.location}
                              {msg.estimatedReturn && ` • Back: ${msg.estimatedReturn}`}
                            </p>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {pendingMessages.length === 0 && approvedMessages.length === 0 && (
                  <div className="p-12 rounded-2xl bg-card backdrop-blur-xl border border-border text-center">
                    <MessageSquare className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-xl text-muted-foreground">No messages to display</p>
                  </div>
                )}
              </>
            )}
          </motion.div>
        )}

        {/* Routines Tab */}
        {activeTab === "routines" && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="space-y-4"
          >
            {showAddRoutine || editingRoutine ? (
              <div className="p-6 rounded-2xl bg-card backdrop-blur-xl border border-border">
                <h3 className="text-lg mb-4">
                  {editingRoutine ? "Edit Routine" : "Add New Routine"}
                </h3>
                <div className="space-y-4">
                  <div>
                    <label className="block mb-2 text-sm">Time</label>
                    <input
                      type="time"
                      value={newRoutineTime}
                      onChange={(e) => setNewRoutineTime(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl bg-input border border-border focus:border-primary focus:outline-none transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block mb-2 text-sm">Label</label>
                    <input
                      type="text"
                      value={newRoutineLabel}
                      onChange={(e) => setNewRoutineLabel(e.target.value)}
                      placeholder="e.g., Morning medication"
                      className="w-full px-4 py-3 rounded-xl bg-input border border-border focus:border-primary focus:outline-none transition-colors"
                    />
                  </div>
                  <div className="flex gap-3">
                    <button
                      onClick={editingRoutine ? handleUpdateRoutine : handleAddRoutine}
                      className="flex-1 py-3 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
                    >
                      {editingRoutine ? "Update Routine" : "Add Routine"}
                    </button>
                    <button
                      onClick={() => {
                        setShowAddRoutine(false);
                        setEditingRoutine(null);
                        setNewRoutineTime("");
                        setNewRoutineLabel("");
                      }}
                      className="flex-1 py-3 rounded-xl bg-muted/20 text-foreground hover:bg-muted/30 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setShowAddRoutine(true)}
                className="w-full p-6 rounded-2xl bg-card backdrop-blur-xl border border-dashed border-border hover:border-primary/50 transition-colors flex items-center justify-center gap-2 text-muted-foreground hover:text-foreground"
              >
                <Plus className="w-5 h-5" />
                Add New Routine
              </button>
            )}

            {routines
              .sort((a, b) => a.time.localeCompare(b.time))
              .map((routine) => (
                <div
                  key={routine.id}
                  className="p-6 rounded-2xl bg-card backdrop-blur-xl border border-border hover:border-border/80 transition-colors flex items-center gap-4"
                >
                  <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center flex-shrink-0">
                    <Clock className="w-6 h-6 text-primary" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium mb-1">{routine.label}</p>
                    <p className="text-sm text-muted-foreground">{routine.time}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleEditRoutine(routine.id)}
                      className="p-2 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    {confirmDelete === routine.id ? (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleDeleteRoutine(routine.id)}
                          className="px-3 py-2 rounded-lg bg-destructive text-destructive-foreground hover:bg-destructive/90 transition-colors text-sm"
                        >
                          Confirm
                        </button>
                        <button
                          onClick={() => setConfirmDelete(null)}
                          className="p-2 rounded-lg text-muted-foreground hover:text-foreground transition-colors"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setConfirmDelete(routine.id)}
                        className="p-2 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
          </motion.div>
        )}

        {/* Logs Tab */}
        {activeTab === "logs" && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="space-y-4"
          >
            {logs.length > 0 && (
              <div className="flex justify-end mb-4">
                {confirmClearLogs ? (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleClearLogs}
                      className="px-4 py-2 rounded-lg bg-destructive text-destructive-foreground hover:bg-destructive/90 transition-colors text-sm"
                    >
                      Confirm Clear All
                    </button>
                    <button
                      onClick={() => setConfirmClearLogs(false)}
                      className="px-4 py-2 rounded-lg bg-muted/20 hover:bg-muted/30 transition-colors text-sm"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setConfirmClearLogs(true)}
                    className="px-4 py-2 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors text-sm flex items-center gap-2"
                  >
                    <Trash2 className="w-4 h-4" />
                    Clear All Logs
                  </button>
                )}
              </div>
            )}

            {logs.length === 0 ? (
              <div className="p-12 rounded-2xl bg-card backdrop-blur-xl border border-border text-center">
                <Clock className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-xl text-muted-foreground">No conversation logs yet</p>
                <p className="text-sm text-muted-foreground/70 mt-2">
                  Conversations from Patient Voice Mode will appear here
                </p>
              </div>
            ) : (
              logs.map((log) => (
                <div
                  key={log.id}
                  className="p-6 rounded-2xl bg-card backdrop-blur-xl border border-border hover:border-border/80 transition-colors"
                >
                  <p className="text-sm text-muted-foreground mb-4">
                    {formatDate(log.timestamp)} at {formatTime(log.timestamp)}
                  </p>
                  <div className="space-y-3">
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Patient</p>
                      <p className="text-foreground/90">{log.userText}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Lumen</p>
                      <p className="text-primary/90">{log.lumenText}</p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </motion.div>
        )}

        {/* Settings Tab */}
        {activeTab === "settings" && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="space-y-6"
          >
            <div className="p-8 rounded-2xl bg-card backdrop-blur-xl border border-border">
              <h2 className="text-xl mb-6">Patient Information</h2>
              <div className="space-y-4">
                <div>
                  <label className="block mb-2 text-sm">Patient Name</label>
                  <input
                    type="text"
                    value={patientNameState}
                    onChange={(e) => setPatientNameState(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl bg-input border border-border focus:border-accent focus:outline-none transition-colors"
                  />
                </div>
                <button 
                  onClick={handleUpdatePatientName}
                  className="px-6 py-3 rounded-xl bg-accent text-accent-foreground hover:bg-accent/90 transition-colors"
                >
                  Update Information
                </button>
              </div>
            </div>

            <div className="p-8 rounded-2xl bg-card backdrop-blur-xl border border-border">
              <h2 className="text-xl mb-3">Access Code Management</h2>
              <p className="text-muted-foreground mb-4">
                Current code: <span className="font-mono text-foreground">{accessCode}</span>
              </p>
              <p className="text-muted-foreground mb-6 text-sm">
                Regenerating the access code will require everyone to use the new code
              </p>
              {confirmRegenCode ? (
                <div className="flex items-center gap-3">
                  <button
                    onClick={handleRegenerateCode}
                    className="px-6 py-3 rounded-xl bg-destructive text-destructive-foreground hover:bg-destructive/90 transition-colors"
                  >
                    Confirm Regenerate
                  </button>
                  <button
                    onClick={() => setConfirmRegenCode(false)}
                    className="px-6 py-3 rounded-xl bg-muted/20 hover:bg-muted/30 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setConfirmRegenCode(true)}
                  className="px-6 py-3 rounded-xl bg-destructive text-destructive-foreground hover:bg-destructive/90 transition-colors"
                >
                  Regenerate Access Code
                </button>
              )}
            </div>

            <div className="p-8 rounded-2xl bg-card backdrop-blur-xl border border-destructive/30">
              <h2 className="text-xl mb-3 text-destructive">Danger Zone</h2>
              <p className="text-muted-foreground mb-6 text-sm">
                This will delete ALL data including your account, messages, routines, logs, and profiles. This cannot be undone.
              </p>
              <button
                onClick={() => {
                  if (confirm('Are you sure you want to delete ALL data? This cannot be undone.')) {
                    resetAllData();
                    onLogout();
                  }
                }}
                className="px-6 py-3 rounded-xl bg-destructive text-destructive-foreground hover:bg-destructive/90 transition-colors"
              >
                Reset All Data & Logout
              </button>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
