import { useState, useEffect, useCallback } from "react";
import { ArrowLeft, Mic, PhoneOff, Loader2 } from "lucide-react";
import { useConversation } from "@elevenlabs/react";
import { apiValidateCode } from "../lib/storage";

interface PatientElevenLabsProps {
  onBack: () => void;
}

const AGENT_ID = import.meta.env.VITE_ELEVENLABS_AGENT_ID as string | undefined;
const USE_CONV_TOKEN = import.meta.env.VITE_ELEVENLABS_USE_CONV_TOKEN === "true";

export function PatientElevenLabs({ onBack }: PatientElevenLabsProps) {
  const [err, setErr] = useState<string | null>(null);
  const [phase, setPhase] = useState<"idle" | "connecting" | "live">("idle");

  const [authenticated, setAuthenticated] = useState(false);
  const [codeDigits, setCodeDigits] = useState(["", "", "", "", "", ""]);
  const [codeError, setCodeError] = useState("");
  const [validating, setValidating] = useState(false);
  const [patientName, setPatientName] = useState("Patient");
  const [householdId, setHouseholdId] = useState("");

  useEffect(() => {
    document.body.style.backgroundColor = "#F6F7FA";
    document.body.style.color = "#17191F";
    return () => { document.body.style.backgroundColor = ""; document.body.style.color = ""; };
  }, []);

  const conversation = useConversation({
    onConnect: () => { setPhase("live"); setErr(null); },
    onDisconnect: () => setPhase("idle"),
    onError: (e) => {
      const msg = typeof e === "object" && e && "message" in e ? String((e as Error).message) : String(e);
      setErr(msg || "Connection error"); setPhase("idle");
    },
    onStatusChange: (s) => { if (s.status === "disconnected") setPhase("idle"); },
  });

  useEffect(() => {
    if (phase === "live") {
      conversation.setVolume({ volume: 1 });
    }
  }, [phase, conversation]);

  const handleDigitClick = (digit: string) => {
    const idx = codeDigits.findIndex((c) => c === "");
    if (idx === -1) return;
    const next = [...codeDigits];
    next[idx] = digit;
    setCodeDigits(next);
    if (idx === 5) {
      const code = next.join("");
      validateCode(code);
    }
  };

  const handleBackspace = () => {
    const lastIdx = codeDigits.map((c, i) => (c !== "" ? i : -1)).filter((i) => i >= 0).pop();
    if (lastIdx !== undefined && lastIdx >= 0) {
      const next = [...codeDigits];
      next[lastIdx] = "";
      setCodeDigits(next);
    }
  };

  const handleClear = () => { setCodeDigits(["", "", "", "", "", ""]); setCodeError(""); };

  const validateCode = async (code: string) => {
    setValidating(true); setCodeError("");
    try {
      const data = await apiValidateCode(code);
      setPatientName(data.patient_name);
      setHouseholdId(data.household_id);
      setAuthenticated(true);
    } catch {
      setCodeError("Invalid access code. Please try again.");
      setTimeout(() => setCodeDigits(["", "", "", "", "", ""]), 500);
    } finally { setValidating(false); }
  };

  const start = useCallback(async () => {
    setErr(null);
    if (!AGENT_ID?.trim()) { setErr("Voice agent not configured."); return; }
    setPhase("connecting");
    try { await navigator.mediaDevices.getUserMedia({ audio: true }); } catch { setErr("Microphone access required."); setPhase("idle"); return; }

    const dynamicVariables = { household_id: householdId, patient_name: patientName };

    try {
      let convId;
      if (USE_CONV_TOKEN) {
        const r = await fetch(`/api/elevenlabs/token?agent_id=${encodeURIComponent(AGENT_ID.trim())}`);
        const j = await r.json();
        if (!r.ok) throw new Error(j.error || "Could not connect");
        convId = await conversation.startSession({
          signedUrl: j.signed_url,
          dynamicVariables,
          clientTools: {},
        });
      } else {
        convId = await conversation.startSession({
          agentId: AGENT_ID.trim(),
          connectionType: "webrtc",
          dynamicVariables,
          clientTools: {},
        });
      }
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed to connect");
      setPhase("idle");
    }
  }, [conversation, householdId, patientName]);

  const stop = useCallback(async () => {
    setPhase("idle");
    try { await conversation.endSession(); } catch {}
  }, [conversation]);

  const configured = Boolean(AGENT_ID?.trim());

  if (!authenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center p-8 bg-[#F6F7FA]" style={{ fontFamily: "'Helvetica Neue', 'Inter', sans-serif" }}>
        <button onClick={onBack} className="absolute top-8 left-8 flex items-center gap-2 text-gray-400 hover:text-[#17191F] transition-colors">
          <ArrowLeft className="w-5 h-5" /><span className="font-medium">Back</span>
        </button>

        <div className="relative z-10 max-w-lg w-full text-center">
          <div className="mb-12">
            <h1 className="text-4xl font-normal tracking-tight text-[#17191F] mb-3">Talk to Lumen</h1>
            <p className="text-xl text-gray-500 mb-1">Enter the code from your caregiver</p>
          </div>

          <div className="mb-6">
            <div className="flex justify-center gap-3 mb-4">
              {codeDigits.map((digit, i) => (
                <div key={i} className={`w-14 h-14 rounded-[16px] flex items-center justify-center border-2 transition-all text-xl font-medium ${
                  digit ? (codeError ? "border-red-400 bg-red-50 text-red-600" : "border-[#17191F] bg-[#17191F]/5 text-[#17191F]") : (codeError ? "border-red-300 bg-white" : "border-gray-200 bg-white")
                }`}>{digit}</div>
              ))}
            </div>
            {codeError && <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 mb-4"><p className="text-red-600 text-sm">{codeError}</p></div>}
            {validating && <p className="text-gray-400 text-sm">Verifying...</p>}
          </div>

          <div className="max-w-sm mx-auto">
            <div className="grid grid-cols-3 gap-3 mb-3">
              {[1,2,3,4,5,6,7,8,9].map((n) => (
                <button key={n} onClick={() => handleDigitClick(n.toString())} disabled={validating} className="h-16 rounded-[16px] bg-white border border-gray-200 hover:border-[#17191F] hover:bg-[#17191F]/5 text-xl font-medium text-[#17191F] disabled:opacity-30 active:scale-95">{n}</button>
              ))}
            </div>
            <div className="grid grid-cols-3 gap-3">
              <button onClick={handleClear} disabled={validating} className="h-16 rounded-[16px] bg-white border border-gray-200 hover:border-red-300 hover:bg-red-50 text-sm font-medium text-gray-500 disabled:opacity-30">Clear</button>
              <button onClick={() => handleDigitClick("0")} disabled={validating} className="h-16 rounded-[16px] bg-white border border-gray-200 hover:border-[#17191F] hover:bg-[#17191F]/5 text-xl font-medium text-[#17191F] disabled:opacity-30 active:scale-95">0</button>
              <button onClick={handleBackspace} disabled={validating} className="h-16 rounded-[16px] bg-white border border-gray-200 hover:border-gray-400 text-sm font-medium text-gray-500 disabled:opacity-30">←</button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-8 relative overflow-hidden bg-[#F6F7FA]" style={{ fontFamily: "'Helvetica Neue', 'Inter', sans-serif" }}>
      <button onClick={() => { void stop(); onBack(); }} className="absolute top-8 left-8 z-20 flex items-center gap-2 text-gray-400 hover:text-[#17191F] transition-colors">
        <ArrowLeft className="w-5 h-5" /><span className="text-sm font-medium">Back</span>
      </button>
      <div className="absolute top-8 right-8 text-right z-20">
        <p className="text-xs text-gray-400">Patient</p>
        <p className="text-sm text-gray-600 font-medium">{patientName}</p>
      </div>

      <div className="relative z-10 flex flex-col items-center max-w-3xl">
        <div className="relative mb-16">
          {phase === "live" && (
            <>
              <div className="absolute rounded-full border-4 border-[#17191F]/20 animate-ping" style={{ width: "320px", height: "320px", left: "-80px", top: "-80px", animationDuration: "2s" }} />
              <div className="absolute rounded-full border-4 border-[#17191F]/15 animate-ping" style={{ width: "240px", height: "240px", left: "-40px", top: "-40px", animationDuration: "2s", animationDelay: "0.3s" }} />
            </>
          )}
          {phase === "idle" && (
            <button type="button" onClick={() => void start()} disabled={!configured} className="focus:outline-none disabled:cursor-not-allowed group">
              <div className="w-40 h-40 rounded-full bg-[#17191F] flex items-center justify-center shadow-[0_20px_60px_rgba(0,0,0,0.15)] group-hover:shadow-[0_20px_60px_rgba(0,0,0,0.25)] transition-all duration-300 group-hover:scale-105 group-active:scale-95">
                <div className="w-32 h-32 rounded-full bg-white/10 backdrop-blur flex items-center justify-center"><Mic className="w-10 h-10 text-white" /></div>
              </div>
            </button>
          )}
          {phase === "connecting" && (
            <div className="w-40 h-40 rounded-full border-2 border-gray-300 flex items-center justify-center bg-white shadow-[0_8px_30px_rgba(0,0,0,0.06)]"><Loader2 className="w-10 h-10 text-[#17191F] animate-spin" /></div>
          )}
          {phase === "live" && (
            <div className="w-40 h-40 rounded-full bg-[#17191F] flex items-center justify-center shadow-[0_20px_60px_rgba(0,0,0,0.2)]">
              <div className="w-32 h-32 rounded-full bg-white/10 backdrop-blur flex items-center justify-center">
                <div className="flex gap-1.5 items-end">
                  <div className="w-2 h-6 bg-white rounded-full animate-pulse" />
                  <div className="w-2 h-10 bg-white rounded-full animate-pulse" style={{ animationDelay: "150ms" }} />
                  <div className="w-2 h-4 bg-white rounded-full animate-pulse" style={{ animationDelay: "300ms" }} />
                  <div className="w-2 h-8 bg-white rounded-full animate-pulse" style={{ animationDelay: "450ms" }} />
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="mb-8">
          <p className={`text-3xl text-center tracking-tight font-normal ${phase === "live" ? "text-[#17191F]" : phase === "connecting" ? "text-gray-400" : "text-gray-500"}`}>
            {phase === "idle" && "Tap to speak"}{phase === "connecting" && "Connecting..."}{phase === "live" && "Listening... speak naturally"}
          </p>
        </div>

        {err && <div className="bg-red-50 border border-red-200 rounded-[16px] px-6 py-4 mb-4 max-w-md"><p className="text-red-600 text-center text-sm">{err}</p></div>}
        {!configured && <div className="bg-amber-50 border border-amber-200 rounded-[16px] px-6 py-4 mb-4 max-w-md"><p className="text-amber-700 text-sm text-center">Voice agent needs setup. Add VITE_ELEVENLABS_AGENT_ID to .env.</p></div>}

        {phase === "live" && (
          <button type="button" onClick={() => void stop()} className="flex items-center gap-2 px-8 py-4 rounded-full bg-red-500 text-white mb-8 hover:bg-red-600 shadow-lg shadow-red-500/20">
            <PhoneOff className="w-5 h-5" /> End conversation
          </button>
        )}

        <div className="mt-4 text-center">
          <p className="text-xs text-gray-400 mb-3">Try saying:</p>
          <div className="flex flex-wrap justify-center gap-2">
            {["What is my name?", "What's my schedule?", "Read my messages", "How are you?"].map((p) => (
              <span key={p} className="text-xs px-4 py-2 rounded-full bg-white border border-gray-200 text-gray-500">&ldquo;{p}&rdquo;</span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
