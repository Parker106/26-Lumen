import { useState, useEffect, useCallback } from "react";
import { ArrowLeft, Send, LogOut, Clock, Calendar, MapPin, CalendarClock, CheckCircle } from "lucide-react";
import { getAuthPatient, getAuthUser, apiCreateMessage, apiGetMessages, apiGetRoutines, type Routine, type Message } from "../lib/storage";

interface FamilyMessageProps {
  onBack: () => void;
  onLogout: () => void;
  patientName: string;
  senderRole: string;
}

const MAX_MESSAGE_LENGTH = 240;

export function FamilyMessage({ onBack, onLogout, patientName, senderRole }: FamilyMessageProps) {
  const [message, setMessage] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const [routines, setRoutines] = useState<Routine[]>([]);
  const [sentMessages, setSentMessages] = useState<Message[]>([]);
  const [activeTab, setActiveTab] = useState<"message" | "schedule" | "history">("message");
  const [includeLocation, setIncludeLocation] = useState(false);
  const [location, setLocation] = useState("");
  const [estimatedReturn, setEstimatedReturn] = useState("");
  const [deliveryType, setDeliveryType] = useState<"immediate" | "scheduled">("immediate");
  const [scheduledAt, setScheduledAt] = useState("");
  const [loading, setLoading] = useState(false);

  const patient = getAuthPatient();
  const user = getAuthUser();
  const patientId = patient?.id || "";

  useEffect(() => {
    document.body.style.backgroundColor = "#F6F7FA";
    document.body.style.color = "#17191F";
    return () => { document.body.style.backgroundColor = ""; document.body.style.color = ""; };
  }, []);

  const loadData = useCallback(async () => {
    if (!patientId) return;
    try { const r = await apiGetRoutines(patientId); setRoutines(r); } catch {}
    try { const m = await apiGetMessages(patientId); setSentMessages(m.filter((msg) => msg.sender_id === user?.id)); } catch {}
  }, [patientId, user?.id]);

  useEffect(() => { loadData(); }, [loadData, activeTab]);

  const handleSend = async () => {
    if (!message.trim()) { setError("Please write a message."); return; }
    if (!patientId) { setError("No patient linked."); return; }
    if (deliveryType === "scheduled" && !scheduledAt) { setError("Please select a scheduled time."); return; }

    setLoading(true); setError("");
    try {
      await apiCreateMessage({
        patient_id: patientId,
        text: message.trim(),
        sender_name: user?.name || senderRole,
        sender_role: senderRole,
        delivery_type: deliveryType,
        scheduled_at: deliveryType === "scheduled" ? new Date(scheduledAt).toISOString() : null,
        location: includeLocation ? location : undefined,
        estimated_return: includeLocation ? estimatedReturn : undefined,
      });
      setSent(true); setMessage(""); setLocation(""); setEstimatedReturn(""); setScheduledAt(""); setIncludeLocation(false); setDeliveryType("immediate");
      setTimeout(() => setSent(false), 3000);
      await loadData();
    } catch (err: any) {
      setError(err.message || "Failed to send");
    } finally { setLoading(false); }
  };

  const formatTime = (dateStr: string) => new Date(dateStr).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
  const formatDate = (dateStr: string) => new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric" });

  const tabs = [
    { id: "message", label: "Send Message", icon: Send },
    { id: "schedule", label: "Schedule", icon: Calendar },
    { id: "history", label: "My Messages", icon: Clock },
  ];

  return (
    <div className="min-h-screen bg-[#F6F7FA]" style={{ fontFamily: "'Helvetica Neue', 'Inter', sans-serif" }}>
      <div className="border-b border-gray-100 bg-white shadow-[0_4px_20px_rgba(0,0,0,0.02)]">
        <div className="max-w-3xl mx-auto px-8 py-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button onClick={onBack} className="text-gray-400 hover:text-[#17191F]"><ArrowLeft className="w-5 h-5" /></button>
            <div>
              <h1 className="text-xl text-[#17191F] font-normal tracking-tight">Lumen · Family Portal</h1>
              <p className="text-gray-500 text-sm">Sending to {patientName}</p>
            </div>
          </div>
          <button onClick={onLogout} className="flex items-center gap-2 px-4 py-2 rounded-full text-gray-400 hover:text-[#17191F] border border-gray-200 text-sm"><LogOut className="w-4 h-4" /> Log Out</button>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-8 py-8">
        <div className="flex gap-2 mb-8">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button key={tab.id} onClick={() => setActiveTab(tab.id as any)} className={`flex items-center gap-2 px-5 py-3 rounded-full transition-all whitespace-nowrap font-medium text-sm ${activeTab === tab.id ? "bg-[#17191F] text-white" : "bg-white border border-gray-200 text-gray-500 hover:text-[#17191F]"}`}>
                <Icon className="w-4 h-4" /> {tab.label}
              </button>
            );
          })}
        </div>

        {activeTab === "message" && (
          <div className="space-y-6">
            <div className="p-8 rounded-[24px] bg-white border border-gray-200 shadow-[0_4px_20px_rgba(0,0,0,0.02)]">
              <h2 className="text-lg mb-4">Write a message for {patientName}</h2>
              <p className="text-sm text-gray-500 mb-6">Lumen will read this aloud in a warm voice. Keep it personal and reassuring.</p>

              <textarea value={message} onChange={(e) => setMessage(e.target.value.slice(0, MAX_MESSAGE_LENGTH))} placeholder={`Hi ${patientName}! Just wanted to say I'm thinking of you...`} rows={4} className="w-full px-4 py-3 rounded-xl bg-[#F6F7FA] border border-gray-200 focus:border-[#17191F] focus:outline-none text-sm resize-none" />
              <p className="text-xs text-gray-400 mt-2 text-right">{message.length}/{MAX_MESSAGE_LENGTH}</p>

              <div className="mt-4 flex items-center gap-3">
                <button onClick={() => setDeliveryType("immediate")} className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${deliveryType === "immediate" ? "bg-[#17191F] text-white" : "bg-[#F6F7FA] border border-gray-200 text-gray-500 hover:text-[#17191F]"}`}>
                  <Send className="w-4 h-4" /> Send Now
                </button>
                <button onClick={() => setDeliveryType("scheduled")} className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${deliveryType === "scheduled" ? "bg-[#17191F] text-white" : "bg-[#F6F7FA] border border-gray-200 text-gray-500 hover:text-[#17191F]"}`}>
                  <CalendarClock className="w-4 h-4" /> Schedule
                </button>
              </div>

              {deliveryType === "scheduled" && (
                <div className="mt-4">
                  <label className="block mb-2 text-sm text-gray-500">When should Lumen deliver this?</label>
                  <input type="datetime-local" value={scheduledAt} onChange={(e) => setScheduledAt(e.target.value)} className="w-full px-4 py-3 rounded-xl bg-[#F6F7FA] border border-gray-200 focus:border-[#17191F] focus:outline-none text-sm" />
                </div>
              )}

              <div className="mt-4">
                <button onClick={() => setIncludeLocation(!includeLocation)} className={`flex items-center gap-2 text-sm px-4 py-2 rounded-xl ${includeLocation ? "bg-[#17191F] text-white" : "bg-[#F6F7FA] text-gray-500"}`}>
                  <MapPin className="w-4 h-4" /> {includeLocation ? "Remove location" : "Add location info"}
                </button>
              </div>

              {includeLocation && (
                <div className="mt-4 space-y-3">
                  <input type="text" value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Where are you? e.g., At the grocery store" className="w-full px-4 py-3 rounded-xl bg-[#F6F7FA] border border-gray-200 focus:border-[#17191F] focus:outline-none text-sm" />
                  <input type="text" value={estimatedReturn} onChange={(e) => setEstimatedReturn(e.target.value)} placeholder="When will you be back? e.g., Around 3 PM" className="w-full px-4 py-3 rounded-xl bg-[#F6F7FA] border border-gray-200 focus:border-[#17191F] focus:outline-none text-sm" />
                </div>
              )}

              {error && <div className="mt-4 bg-red-50 border border-red-200 rounded-xl px-4 py-3"><p className="text-red-600 text-sm">{error}</p></div>}

              {sent && (
                <div className="mt-4 bg-green-50 border border-green-200 rounded-xl px-4 py-3 flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  <p className="text-green-700 text-sm">Message sent! {deliveryType === "scheduled" ? "It will be delivered at the scheduled time." : "The caregiver will review it."}</p>
                </div>
              )}

              <button onClick={handleSend} disabled={loading || !message.trim()} className="mt-6 w-full py-4 rounded-full bg-[#17191F] text-white hover:scale-[1.02] transition-transform font-medium text-lg shadow-lg shadow-black/10 disabled:opacity-50 flex items-center justify-center gap-2">
                {loading ? "Sending..." : <><Send className="w-5 h-5" /> {deliveryType === "scheduled" ? "Schedule Message" : "Send Message"}</>}
              </button>
            </div>
          </div>
        )}

        {activeTab === "schedule" && (
          <div className="space-y-4">
            <div className="mb-6">
              <h2 className="text-lg mb-2">{patientName}'s Daily Schedule</h2>
              <p className="text-sm text-gray-500">Set by the caregiver. Lumen uses this for reminders.</p>
            </div>
            {routines.length === 0 ? (
              <div className="p-12 rounded-[24px] bg-white border border-gray-200 text-center">
                <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">No routines set up yet</p>
              </div>
            ) : (
              routines.sort((a, b) => a.time.localeCompare(b.time)).map((r) => (
                <div key={r.id} className="p-5 rounded-[24px] bg-white border border-gray-200 flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center"><Clock className="w-5 h-5 text-[#17191F]" /></div>
                  <div><p className="font-medium">{r.label}</p><p className="text-sm text-gray-500">{r.time}</p></div>
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === "history" && (
          <div className="space-y-4">
            <div className="mb-6">
              <h2 className="text-lg mb-2">Your Sent Messages</h2>
              <p className="text-sm text-gray-500">Messages you have sent to {patientName}</p>
            </div>
            {sentMessages.length === 0 ? (
              <div className="p-12 rounded-[24px] bg-white border border-gray-200 text-center">
                <Send className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">No messages sent yet</p>
              </div>
            ) : (
              sentMessages.map((msg) => (
                <div key={msg.id} className={`p-5 rounded-[24px] bg-white border ${msg.status === "approved" ? "border-green-200" : msg.status === "rejected" ? "border-red-200" : "border-yellow-200"}`}>
                  <div className="flex items-start justify-between mb-2">
                    <p className="text-sm font-medium text-gray-500">{msg.delivery_type === "scheduled" ? "Scheduled" : "Immediate"}</p>
                    <span className={`text-xs px-2 py-1 rounded-full ${msg.status === "approved" ? "bg-green-100 text-green-700" : msg.status === "rejected" ? "bg-red-100 text-red-700" : "bg-yellow-100 text-yellow-700"}`}>{msg.status}</span>
                  </div>
                  <p className="text-gray-600">{msg.text}</p>
                  {msg.created_at && <p className="text-xs text-gray-400 mt-2">{formatDate(msg.created_at)} at {formatTime(msg.created_at)}</p>}
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
