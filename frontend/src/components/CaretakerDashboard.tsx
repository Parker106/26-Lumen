import { useState, useEffect, useCallback } from "react";
import { motion } from "motion/react";
import { Copy, Plus, Check, Clock, MessageSquare, Calendar, FileText, BookOpen, Settings, LogOut, Trash2, Edit2, X, CheckCircle, XCircle, AlertCircle, Users, ChevronDown } from "lucide-react";
import {
  getAuthPatients,
  getAuthPatient,
  getHouseholdIdForApi,
  setActivePatientId,
  apiGetMessages,
  apiGetRoutines,
  apiCreateRoutine,
  apiUpdateRoutine,
  apiDeleteRoutine,
  apiUpdateMessageStatus,
  apiDeleteMessage,
  apiCreatePatient,
  clearAuthSession,
  resetAllData,
  type Routine,
  type Message,
  type Patient,
} from "../lib/storage";

interface CaretakerDashboardProps {
  onLogout: () => void;
}

export function CaretakerDashboard({ onLogout }: CaretakerDashboardProps) {
  useEffect(() => {
    document.body.style.backgroundColor = "#F6F7FA";
    document.body.style.color = "#17191F";
    return () => { document.body.style.backgroundColor = ""; document.body.style.color = ""; };
  }, []);

  const [patients, setPatients] = useState<Patient[]>(getAuthPatients());
  const [activePatient, setActivePatient] = useState<Patient | null>(getAuthPatient());
  const [showPatientDropdown, setShowPatientDropdown] = useState(false);
  const [showAddPatient, setShowAddPatient] = useState(false);
  const [newPatientName, setNewPatientName] = useState("");
  const [addingPatient, setAddingPatient] = useState(false);

  const householdId = activePatient?.household_id || getHouseholdIdForApi();
  const patientId = activePatient?.id || "";

  const [activeTab, setActiveTab] = useState<"overview" | "care" | "messages" | "routines" | "settings">("overview");
  const [copied, setCopied] = useState(false);
  const [showAddRoutine, setShowAddRoutine] = useState(false);
  const [editingRoutine, setEditingRoutine] = useState<string | null>(null);
  const [newRoutineTime, setNewRoutineTime] = useState("");
  const [newRoutineLabel, setNewRoutineLabel] = useState("");
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [confirmClearMessages, setConfirmClearMessages] = useState(false);

  const [messages, setMessages] = useState<Message[]>([]);
  const [routines, setRoutinesState] = useState<Routine[]>([]);
  const [careDocText, setCareDocText] = useState("");
  const [indexing, setIndexing] = useState(false);
  const [indexMsg, setIndexMsg] = useState<string | null>(null);
  const [ragChunks, setRagChunks] = useState<number | null>(null);

  const accessCode = activePatient?.access_code || "------";
  const patientNameState = activePatient?.name || "Patient";

  const pendingMessages = messages.filter((m) => m.status === "pending");
  const approvedMessages = messages.filter((m) => m.status === "approved");

  const switchPatient = (patient: Patient) => {
    setActivePatientId(patient.id);
    setActivePatient(patient);
    setShowPatientDropdown(false);
    setMessages([]);
    setRoutinesState([]);
    setRagChunks(null);
  };

  const handleAddPatient = async () => {
    if (!newPatientName.trim()) return;
    setAddingPatient(true);
    try {
      const patient = await apiCreatePatient(newPatientName.trim());
      setPatients((prev) => [...prev, patient]);
      switchPatient(patient);
      setNewPatientName("");
      setShowAddPatient(false);
    } catch {} finally { setAddingPatient(false); }
  };

  const refreshRagCount = useCallback(() => {
    fetch(`/api/rag/status?household_id=${encodeURIComponent(householdId)}`)
      .then((r) => r.json())
      .then((j) => setRagChunks(typeof j.chunks === "number" ? j.chunks : 0))
      .catch(() => setRagChunks(null));
  }, [householdId]);

  const loadMessages = useCallback(async () => {
    if (!patientId) return;
    try { const data = await apiGetMessages(patientId); setMessages(data); } catch {}
  }, [patientId]);

  const loadRoutines = useCallback(async () => {
    if (!patientId) return;
    try { const data = await apiGetRoutines(patientId); setRoutinesState(data); } catch {}
  }, [patientId]);

  useEffect(() => {
    refreshRagCount();
    loadMessages();
    loadRoutines();
  }, [activeTab, refreshRagCount, loadMessages, loadRoutines]);

  const handleCopyCode = () => {
    navigator.clipboard.writeText(accessCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleAddRoutine = async () => {
    if (newRoutineTime && newRoutineLabel && patientId) {
      try {
        await apiCreateRoutine({ patient_id: patientId, time: newRoutineTime, label: newRoutineLabel, recurring: true });
        await loadRoutines();
        setNewRoutineTime(""); setNewRoutineLabel(""); setShowAddRoutine(false);
      } catch {}
    }
  };

  const handleEditRoutine = (id: string) => {
    const routine = routines.find((r) => r.id === id);
    if (routine) { setEditingRoutine(id); setNewRoutineTime(routine.time); setNewRoutineLabel(routine.label); }
  };

  const handleUpdateRoutine = async () => {
    if (editingRoutine && newRoutineTime && newRoutineLabel) {
      try {
        await apiUpdateRoutine(editingRoutine, { time: newRoutineTime, label: newRoutineLabel });
        await loadRoutines();
        setEditingRoutine(null); setNewRoutineTime(""); setNewRoutineLabel("");
      } catch {}
    }
  };

  const handleDeleteRoutine = async (id: string) => {
    try { await apiDeleteRoutine(id); await loadRoutines(); setConfirmDelete(null); } catch {}
  };

  const handleApproveMessage = async (id: string) => {
    try { await apiUpdateMessageStatus(id, "approved"); await loadMessages(); } catch {}
  };

  const handleRejectMessage = async (id: string) => {
    try { await apiUpdateMessageStatus(id, "rejected"); await loadMessages(); } catch {}
  };

  const handleDeleteAllMessages = async () => {
    try {
      for (const m of messages) { await apiDeleteMessage(m.id); }
      setMessages([]); setConfirmClearMessages(false);
    } catch {}
  };

  const handleIndexCareDocs = async () => {
    const text = careDocText.trim();
    if (!text) { setIndexMsg("Add care notes or document text first."); return; }
    setIndexing(true); setIndexMsg(null);
    try {
      const res = await fetch("/api/documents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, docId: "main-care-memory", household_id: householdId }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.message || j.error || "Index failed");
      setIndexMsg(`Indexed ${j.chunks} chunks. Lumen can now answer from this text.`);
      setCareDocText(""); refreshRagCount();
    } catch (e) {
      setIndexMsg(e instanceof Error ? e.message : "Could not index. Is the API running with OPENAI_API_KEY?");
    } finally { setIndexing(false); }
  };

  const formatTime = (dateStr: string) => new Date(dateStr).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
  const formatDate = (dateStr: string) => new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

  const tabs = [
    { id: "overview", label: "Overview", icon: FileText },
    { id: "care", label: "Care memory", icon: BookOpen },
    { id: "messages", label: "Messages", icon: MessageSquare },
    { id: "routines", label: "Routines", icon: Calendar },
    { id: "settings", label: "Settings", icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-[#F6F7FA]" style={{ fontFamily: "'Helvetica Neue', 'Inter', sans-serif" }}>
      <div className="border-b border-gray-100 bg-white shadow-[0_4px_20px_rgba(0,0,0,0.02)]">
        <div className="max-w-7xl mx-auto px-8 py-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl mb-1 text-[#17191F] font-normal tracking-tight">Lumen · Caregiver</h1>
            <p className="text-gray-500">Managing care for your patients</p>
          </div>
          <button onClick={onLogout} className="flex items-center gap-2 px-5 py-3 rounded-full text-gray-400 hover:text-[#17191F] hover:bg-gray-50 transition-colors border border-gray-200">
            <LogOut className="w-4 h-4" /> Log Out
          </button>
        </div>
      </div>

      <div className="border-b border-gray-100 bg-white">
        <div className="max-w-7xl mx-auto px-8 py-4 flex items-center gap-4">
          <Users className="w-5 h-5 text-gray-400" />
          <div className="relative">
            <button
              onClick={() => setShowPatientDropdown(!showPatientDropdown)}
              className="flex items-center gap-2 px-5 py-3 rounded-xl bg-[#F6F7FA] border border-gray-200 hover:border-[#17191F] transition-colors min-w-[200px]"
            >
              <span className="font-medium text-[#17191F]">{patientNameState}</span>
              <ChevronDown className={`w-4 h-4 text-gray-400 ml-auto transition-transform ${showPatientDropdown ? "rotate-180" : ""}`} />
            </button>
            {showPatientDropdown && (
              <div className="absolute top-full left-0 mt-2 w-72 bg-white rounded-xl border border-gray-200 shadow-lg z-50 overflow-hidden">
                {patients.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => switchPatient(p)}
                    className={`w-full text-left px-5 py-3 hover:bg-[#F6F7FA] transition-colors flex items-center justify-between ${p.id === activePatient?.id ? "bg-[#F6F7FA]" : ""}`}
                  >
                    <div>
                      <p className="font-medium text-[#17191F]">{p.name}</p>
                      <p className="text-xs text-gray-400 font-mono">{p.access_code}</p>
                    </div>
                    {p.id === activePatient?.id && <Check className="w-4 h-4 text-green-500" />}
                  </button>
                ))}
                <button
                  onClick={() => { setShowPatientDropdown(false); setShowAddPatient(true); }}
                  className="w-full text-left px-5 py-3 hover:bg-[#F6F7FA] transition-colors flex items-center gap-2 text-gray-500 border-t border-gray-100"
                >
                  <Plus className="w-4 h-4" /> Add new patient
                </button>
              </div>
            )}
          </div>
          <span className="text-sm text-gray-400">
            {patients.length} patient{patients.length !== 1 ? "s" : ""}
          </span>
        </div>
      </div>

      {showAddPatient && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowAddPatient(false)}>
          <div className="bg-white rounded-[24px] p-8 w-full max-w-md shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-xl mb-2">Add New Patient</h2>
            <p className="text-sm text-gray-500 mb-6">A unique access code and care ID will be generated automatically.</p>
            <input
              type="text"
              value={newPatientName}
              onChange={(e) => setNewPatientName(e.target.value)}
              placeholder="Patient name"
              className="w-full px-4 py-3 rounded-xl bg-[#F6F7FA] border border-gray-200 focus:border-[#17191F] focus:outline-none mb-4"
              autoFocus
              onKeyDown={(e) => { if (e.key === "Enter") handleAddPatient(); }}
            />
            <div className="flex gap-3">
              <button onClick={handleAddPatient} disabled={addingPatient || !newPatientName.trim()} className="flex-1 py-3 rounded-xl bg-[#17191F] text-white hover:bg-gray-800 disabled:opacity-50">
                {addingPatient ? "Creating..." : "Add Patient"}
              </button>
              <button onClick={() => { setShowAddPatient(false); setNewPatientName(""); }} className="flex-1 py-3 rounded-xl bg-gray-100 hover:bg-gray-200">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-8 py-8">
        <div className="flex gap-2 mb-8 overflow-x-auto pb-2">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button key={tab.id} onClick={() => setActiveTab(tab.id as any)} className={`flex items-center gap-2 px-5 py-3 rounded-full transition-all whitespace-nowrap font-medium ${activeTab === tab.id ? "bg-[#17191F] text-white shadow-lg shadow-black/10" : "bg-white border border-gray-200 text-gray-500 hover:text-[#17191F] hover:border-gray-400"}`}>
                <Icon className="w-4 h-4" /> {tab.label}
              </button>
            );
          })}
        </div>

        {activeTab === "overview" && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="space-y-6">
            <div className="p-8 rounded-[24px] bg-white border border-gray-200 shadow-[0_4px_20px_rgba(0,0,0,0.02)]">
              <h2 className="text-xl mb-2">Patient Access Code</h2>
              <p className="text-gray-500 mb-6">Share this code with family, friends, or help {patientNameState} enter it for Patient Mode</p>
              <div className="flex items-center gap-4 flex-wrap">
                <div className="flex-1 min-w-[200px] px-6 py-4 rounded-xl bg-[#F6F7FA] border-2 border-gray-300">
                  <p className="text-4xl tracking-wider font-mono">{accessCode}</p>
                </div>
                <button onClick={handleCopyCode} className="px-6 py-4 rounded-xl bg-[#17191F] text-white hover:bg-gray-800 transition-colors flex items-center gap-2">
                  {copied ? <><Check className="w-5 h-5" /> Copied</> : <><Copy className="w-5 h-5" /> Copy</>}
                </button>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="p-6 rounded-[24px] bg-white border border-gray-200 shadow-[0_4px_20px_rgba(0,0,0,0.02)]">
                <div className="flex items-center gap-3 mb-2"><MessageSquare className="w-5 h-5 text-gray-600" /><p className="text-gray-500">Messages</p></div>
                <p className="text-3xl">{messages.length}</p>
              </div>
              <div className="p-6 rounded-[24px] bg-white border border-gray-200 shadow-[0_4px_20px_rgba(0,0,0,0.02)]">
                <div className="flex items-center gap-3 mb-2"><Calendar className="w-5 h-5 text-[#17191F]" /><p className="text-gray-500">Routines</p></div>
                <p className="text-3xl">{routines.length}</p>
              </div>
              <div className="p-6 rounded-[24px] bg-white border border-gray-200 shadow-[0_4px_20px_rgba(0,0,0,0.02)]">
                <div className="flex items-center gap-3 mb-2"><FileText className="w-5 h-5 text-[#17191F]" /><p className="text-gray-500">Care memory chunks</p></div>
                <p className="text-3xl">{ragChunks ?? "—"}</p>
              </div>
            </div>
          </motion.div>
        )}

        {activeTab === "care" && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6 max-w-3xl">
            <div className="p-6 rounded-[24px] bg-white border border-gray-200 shadow-[0_4px_20px_rgba(0,0,0,0.02)]">
              <h2 className="text-xl mb-2">Documents & notes for Lumen</h2>
              <p className="text-sm text-gray-500 mb-4">Medication, visitors, routines in prose, comfort phrases — Lumen retrieves relevant lines via RAG.</p>
              <textarea value={careDocText} onChange={(e) => setCareDocText(e.target.value)} placeholder="e.g. Patient enjoys listening to jazz. Son visits every Sunday. Favorite snack is oatmeal cookies." rows={12} className="w-full px-4 py-3 rounded-xl bg-[#F6F7FA] border border-gray-200 focus:border-[#17191F] focus:outline-none text-sm resize-y min-h-[200px]" />
              <div className="mt-4 flex flex-wrap gap-3 items-center">
                <button type="button" disabled={indexing} onClick={handleIndexCareDocs} className="px-6 py-3 rounded-xl bg-[#17191F] text-white hover:bg-gray-800 disabled:opacity-50">{indexing ? "Indexing…" : "Save & index for Lumen"}</button>
                {indexMsg && <p className="text-sm text-gray-500">{indexMsg}</p>}
              </div>
            </div>
          </motion.div>
        )}

        {activeTab === "messages" && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="space-y-6">
            {messages.length > 0 && (
              <div className="flex justify-end mb-4">
                {confirmClearMessages ? (
                  <div className="flex items-center gap-2">
                    <button onClick={handleDeleteAllMessages} className="px-4 py-2 rounded-lg bg-red-500 text-white hover:bg-red-600 text-sm">Confirm Clear All</button>
                    <button onClick={() => setConfirmClearMessages(false)} className="px-4 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-sm">Cancel</button>
                  </div>
                ) : (
                  <button onClick={() => setConfirmClearMessages(true)} className="px-4 py-2 rounded-lg text-gray-500 hover:text-red-500 hover:bg-red-50 text-sm flex items-center gap-2"><Trash2 className="w-4 h-4" /> Clear All</button>
                )}
              </div>
            )}

            {messages.length === 0 ? (
              <div className="p-12 rounded-[24px] bg-white border border-gray-200 shadow-[0_4px_20px_rgba(0,0,0,0.02)] text-center">
                <MessageSquare className="w-12 h-12 text-gray-500 mx-auto mb-4" />
                <p className="text-xl text-gray-500">No messages yet</p>
                <p className="text-sm text-gray-500/70 mt-2">Family and friends can send messages through the Family Portal</p>
              </div>
            ) : (
              <>
                {pendingMessages.length > 0 && (
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 mb-4"><AlertCircle className="w-5 h-5 text-yellow-500" /><h3 className="text-lg font-medium">Pending Approval ({pendingMessages.length})</h3></div>
                    {pendingMessages.map((msg) => (
                      <div key={msg.id} className="p-6 rounded-[24px] bg-white border-2 border-yellow-400/40 hover:border-yellow-400/60 shadow-[0_4px_20px_rgba(0,0,0,0.02)]">
                        <div className="flex items-start justify-between mb-3">
                          <div><p className="font-medium">{msg.sender_name}</p><p className="text-sm text-gray-500">{msg.sender_role}</p></div>
                          {msg.created_at && <p className="text-sm text-gray-500">{formatDate(msg.created_at)} at {formatTime(msg.created_at)}</p>}
                        </div>
                        <p className="text-gray-500 leading-relaxed mb-4">{msg.text}</p>
                        {msg.delivery_type === "scheduled" && msg.scheduled_at && (
                          <p className="text-xs text-blue-500 mb-3">Scheduled for {formatDate(msg.scheduled_at)} at {formatTime(msg.scheduled_at)}</p>
                        )}
                        {msg.location && (
                          <div className="mb-4 p-3 rounded-lg bg-amber-50 border border-amber-200">
                            <p className="text-sm text-[#17191F]">Location: {msg.location}{msg.estimated_return && ` · Back: ${msg.estimated_return}`}</p>
                          </div>
                        )}
                        <div className="flex items-center gap-3">
                          <button onClick={() => handleApproveMessage(msg.id)} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-green-600 text-white hover:bg-green-700 text-sm"><CheckCircle className="w-4 h-4" /> Approve</button>
                          <button onClick={() => handleRejectMessage(msg.id)} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-red-500 text-white hover:bg-red-600 text-sm"><XCircle className="w-4 h-4" /> Reject</button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {approvedMessages.length > 0 && (
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 mb-4"><CheckCircle className="w-5 h-5 text-green-500" /><h3 className="text-lg font-medium">Approved ({approvedMessages.length})</h3></div>
                    {approvedMessages.map((msg) => (
                      <div key={msg.id} className="p-6 rounded-[24px] bg-white border border-green-200 hover:border-green-300 shadow-[0_4px_20px_rgba(0,0,0,0.02)]">
                        <div className="flex items-start justify-between mb-3">
                          <div><p className="font-medium">{msg.sender_name}</p><p className="text-sm text-gray-500">{msg.sender_role}</p></div>
                          <div className="text-right">
                            {msg.created_at && <p className="text-sm text-gray-500">{formatDate(msg.created_at)} at {formatTime(msg.created_at)}</p>}
                            <span className="text-xs text-green-500">Approved</span>
                          </div>
                        </div>
                        <p className="text-gray-500 leading-relaxed">{msg.text}</p>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </motion.div>
        )}

        {activeTab === "routines" && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="space-y-4">
            {showAddRoutine || editingRoutine ? (
              <div className="p-6 rounded-[24px] bg-white border border-gray-200 shadow-[0_4px_20px_rgba(0,0,0,0.02)]">
                <h3 className="text-lg mb-4">{editingRoutine ? "Edit Routine" : "Add New Routine"}</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block mb-2 text-sm">Time</label>
                    <input type="time" value={newRoutineTime} onChange={(e) => setNewRoutineTime(e.target.value)} className="w-full px-4 py-3 rounded-xl bg-[#F6F7FA] border border-gray-200 focus:border-[#17191F] focus:outline-none" />
                  </div>
                  <div>
                    <label className="block mb-2 text-sm">Label</label>
                    <input type="text" value={newRoutineLabel} onChange={(e) => setNewRoutineLabel(e.target.value)} placeholder="e.g., Morning walk at the park" className="w-full px-4 py-3 rounded-xl bg-[#F6F7FA] border border-gray-200 focus:border-[#17191F] focus:outline-none" />
                  </div>
                  <div className="flex gap-3">
                    <button onClick={editingRoutine ? handleUpdateRoutine : handleAddRoutine} className="flex-1 py-3 rounded-xl bg-[#17191F] text-white hover:bg-gray-800">{editingRoutine ? "Update" : "Add Routine"}</button>
                    <button onClick={() => { setShowAddRoutine(false); setEditingRoutine(null); setNewRoutineTime(""); setNewRoutineLabel(""); }} className="flex-1 py-3 rounded-xl bg-gray-100 hover:bg-gray-200">Cancel</button>
                  </div>
                </div>
              </div>
            ) : (
              <button onClick={() => setShowAddRoutine(true)} className="w-full p-6 rounded-[24px] bg-white border border-dashed border-gray-300 hover:border-[#17191F] flex items-center justify-center gap-2 text-gray-500 hover:text-[#17191F]">
                <Plus className="w-5 h-5" /> Add New Routine
              </button>
            )}

            {routines.sort((a, b) => a.time.localeCompare(b.time)).map((routine) => (
              <div key={routine.id} className="p-6 rounded-[24px] bg-white border border-gray-200 shadow-[0_4px_20px_rgba(0,0,0,0.02)] flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-gray-100 flex items-center justify-center flex-shrink-0"><Clock className="w-6 h-6 text-[#17191F]" /></div>
                <div className="flex-1"><p className="font-medium mb-1">{routine.label}</p><p className="text-sm text-gray-500">{routine.time}</p></div>
                <div className="flex items-center gap-2">
                  <button onClick={() => handleEditRoutine(routine.id)} className="p-2 rounded-lg text-gray-500 hover:text-[#17191F] hover:bg-[#F6F7FA]"><Edit2 className="w-4 h-4" /></button>
                  {confirmDelete === routine.id ? (
                    <div className="flex items-center gap-2">
                      <button onClick={() => handleDeleteRoutine(routine.id)} className="px-3 py-2 rounded-lg bg-red-500 text-white hover:bg-red-600 text-sm">Confirm</button>
                      <button onClick={() => setConfirmDelete(null)} className="p-2 rounded-lg text-gray-500 hover:text-[#17191F]"><X className="w-4 h-4" /></button>
                    </div>
                  ) : (
                    <button onClick={() => setConfirmDelete(routine.id)} className="p-2 rounded-lg text-gray-500 hover:text-red-500 hover:bg-red-50"><Trash2 className="w-4 h-4" /></button>
                  )}
                </div>
              </div>
            ))}
          </motion.div>
        )}

        {activeTab === "settings" && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="space-y-6">
            <div className="p-8 rounded-[24px] bg-white border border-gray-200 shadow-[0_4px_20px_rgba(0,0,0,0.02)]">
              <h2 className="text-xl mb-6">Your Patients</h2>
              <div className="space-y-3">
                {patients.map((p) => (
                  <div key={p.id} className={`p-4 rounded-xl border flex items-center justify-between ${p.id === activePatient?.id ? "border-[#17191F] bg-[#17191F]/5" : "border-gray-200"}`}>
                    <div>
                      <p className="font-medium">{p.name}</p>
                      <p className="text-sm text-gray-500">Code: <span className="font-mono">{p.access_code}</span></p>
                    </div>
                    {p.id === activePatient?.id && <span className="text-xs bg-[#17191F] text-white px-3 py-1 rounded-full">Active</span>}
                  </div>
                ))}
              </div>
              <button onClick={() => setShowAddPatient(true)} className="mt-4 flex items-center gap-2 px-5 py-3 rounded-xl border border-dashed border-gray-300 hover:border-[#17191F] text-gray-500 hover:text-[#17191F]">
                <Plus className="w-4 h-4" /> Add another patient
              </button>
            </div>

            <div className="p-8 rounded-[24px] bg-white border border-red-200 shadow-[0_4px_20px_rgba(0,0,0,0.02)]">
              <h2 className="text-xl mb-3 text-red-500">Danger Zone</h2>
              <p className="text-gray-500 mb-6 text-sm">This will clear all local session data and log you out.</p>
              <button onClick={() => { if (confirm("Are you sure? This will log you out.")) { resetAllData(); onLogout(); } }} className="px-6 py-3 rounded-xl bg-red-500 text-white hover:bg-red-600">
                Reset Local Data & Logout
              </button>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
