import { useState, useEffect } from "react";
import { ArrowLeft } from "lucide-react";
import { apiRegister, apiLogin, apiLinkPatient, isFamilyLoggedIn, getAuthPatient } from "../lib/storage";

interface FamilyAccessEntryProps {
  onBack: () => void;
  onSuccess: () => void;
}

export function FamilyAccessEntry({ onBack, onSuccess }: FamilyAccessEntryProps) {
  const [step, setStep] = useState<"auth" | "link">("auth");
  const [isSignUp, setIsSignUp] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [accessCode, setAccessCode] = useState("");
  const [relationship, setRelationship] = useState("family");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    document.body.style.backgroundColor = "#F6F7FA";
    document.body.style.color = "#17191F";
    return () => { document.body.style.backgroundColor = ""; document.body.style.color = ""; };
  }, []);

  useEffect(() => {
    if (isFamilyLoggedIn()) {
      if (getAuthPatient()) { onSuccess(); } else { setStep("link"); }
    }
  }, [onSuccess]);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!email.trim() || !password.trim()) { setError("Please fill in all fields."); return; }
    if (password.length < 4) { setError("Password must be at least 4 characters."); return; }

    setLoading(true);
    try {
      if (isSignUp) {
        const result = await apiRegister(email, password, "family", name);
        if (result.patients.length > 0) { onSuccess(); return; }
      } else {
        const result = await apiLogin(email, password);
        if (result.patients.length > 0) { onSuccess(); return; }
      }
      setStep("link");
    } catch (err: any) {
      setError(err.message || "Something went wrong");
    } finally { setLoading(false); }
  };

  const handleLink = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!accessCode.trim()) { setError("Please enter the access code."); return; }

    setLoading(true);
    try {
      await apiLinkPatient(accessCode, relationship);
      onSuccess();
    } catch (err: any) {
      setError(err.message || "Invalid code");
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-8 relative overflow-hidden bg-[#F6F7FA]" style={{ fontFamily: "'Helvetica Neue', 'Inter', sans-serif" }}>
      <button onClick={onBack} className="absolute top-8 left-8 flex items-center gap-2 text-gray-400 hover:text-[#17191F] transition-colors">
        <ArrowLeft className="w-5 h-5" /><span className="font-medium">Back</span>
      </button>

      <div className="relative z-10 max-w-md w-full">
        <div className="p-10 rounded-[24px] bg-white border border-gray-200 shadow-[0_8px_30px_rgba(0,0,0,0.04)]">

          {step === "auth" && (
            <>
              <div className="mb-8">
                <h1 className="text-3xl font-normal tracking-tight text-[#17191F] mb-2">Family & Friends</h1>
                <p className="text-gray-500 text-lg">{isSignUp ? "Create an account" : "Sign in"} to send messages</p>
              </div>

              <form onSubmit={handleAuth} className="space-y-5">
                {isSignUp && (
                  <div>
                    <label className="block mb-2 text-sm font-medium text-gray-500">Your Name</label>
                    <input type="text" value={name} onChange={(e) => setName(e.target.value)} className="w-full px-5 py-4 rounded-xl bg-[#F6F7FA] border border-gray-200 focus:outline-none focus:ring-1 focus:ring-[#17191F] text-[#17191F]" placeholder="Your name" />
                  </div>
                )}
                <div>
                  <label className="block mb-2 text-sm font-medium text-gray-500">Email</label>
                  <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full px-5 py-4 rounded-xl bg-[#F6F7FA] border border-gray-200 focus:outline-none focus:ring-1 focus:ring-[#17191F] text-[#17191F]" placeholder="your@email.com" required />
                </div>
                <div>
                  <label className="block mb-2 text-sm font-medium text-gray-500">Password</label>
                  <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full px-5 py-4 rounded-xl bg-[#F6F7FA] border border-gray-200 focus:outline-none focus:ring-1 focus:ring-[#17191F] text-[#17191F]" placeholder="••••••••" required />
                </div>

                {error && <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3"><p className="text-red-600 text-sm">{error}</p></div>}

                <button type="submit" disabled={loading} className="w-full py-4 rounded-full bg-[#17191F] text-white hover:scale-[1.02] transition-transform font-medium text-lg shadow-lg shadow-black/10 disabled:opacity-50">
                  {loading ? "Please wait..." : isSignUp ? "Create Account" : "Log In"}
                </button>
              </form>

              <div className="mt-6 text-center">
                <button onClick={() => { setIsSignUp(!isSignUp); setError(""); }} className="text-sm text-gray-400 hover:text-[#17191F]">
                  {isSignUp ? "Already have an account? Log in" : "Need an account? Create one"}
                </button>
              </div>
            </>
          )}

          {step === "link" && (
            <>
              <div className="mb-8">
                <h1 className="text-3xl font-normal tracking-tight text-[#17191F] mb-2">Link to Patient</h1>
                <p className="text-gray-500 text-lg">Enter the access code from the caregiver</p>
              </div>

              <form onSubmit={handleLink} className="space-y-5">
                <div>
                  <label className="block mb-2 text-sm font-medium text-gray-500">Access Code</label>
                  <input type="text" value={accessCode} onChange={(e) => setAccessCode(e.target.value)} maxLength={6} className="w-full px-5 py-4 rounded-xl bg-[#F6F7FA] border border-gray-200 focus:outline-none focus:ring-1 focus:ring-[#17191F] text-[#17191F] text-center text-2xl tracking-[0.3em] font-mono" placeholder="000000" required />
                </div>
                <div>
                  <label className="block mb-2 text-sm font-medium text-gray-500">Your Relationship</label>
                  <select value={relationship} onChange={(e) => setRelationship(e.target.value)} className="w-full px-5 py-4 rounded-xl bg-[#F6F7FA] border border-gray-200 focus:outline-none focus:ring-1 focus:ring-[#17191F] text-[#17191F]">
                    <option value="family">Family Member</option>
                    <option value="son">Son</option>
                    <option value="daughter">Daughter</option>
                    <option value="friend">Friend</option>
                    <option value="neighbor">Neighbor</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                {error && <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3"><p className="text-red-600 text-sm">{error}</p></div>}

                <button type="submit" disabled={loading} className="w-full py-4 rounded-full bg-[#17191F] text-white hover:scale-[1.02] transition-transform font-medium text-lg shadow-lg shadow-black/10 disabled:opacity-50">
                  {loading ? "Linking..." : "Connect to Patient"}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
