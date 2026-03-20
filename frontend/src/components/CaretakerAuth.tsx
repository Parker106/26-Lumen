import { useState, useEffect } from "react";
import { ArrowLeft } from "lucide-react";
import { apiRegister, apiLogin, isCaretakerLoggedIn } from "../lib/storage";

interface CaretakerAuthProps {
  onBack: () => void;
  onSuccess: () => void;
}

export function CaretakerAuth({ onBack, onSuccess }: CaretakerAuthProps) {
  const [isSignUp, setIsSignUp] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [patientName, setPatientName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isCaretakerLoggedIn()) onSuccess();
  }, [onSuccess]);

  useEffect(() => {
    document.body.style.backgroundColor = "#F6F7FA";
    document.body.style.color = "#17191F";
    return () => { document.body.style.backgroundColor = ""; document.body.style.color = ""; };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!email.trim() || !password.trim()) { setError("Please fill in all required fields."); return; }
    if (isSignUp && !patientName.trim()) { setError("Please enter the patient's name."); return; }
    if (password.length < 4) { setError("Password must be at least 4 characters."); return; }

    setLoading(true);
    try {
      if (isSignUp) {
        await apiRegister(email, password, "caregiver", name, patientName);
      } else {
        await apiLogin(email, password);
      }
      onSuccess();
    } catch (err: any) {
      setError(err.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-8 relative overflow-hidden bg-[#F6F7FA]" style={{ fontFamily: "'Helvetica Neue', 'Inter', sans-serif" }}>
      <button onClick={onBack} className="absolute top-8 left-8 flex items-center gap-2 text-gray-400 hover:text-[#17191F] transition-colors">
        <ArrowLeft className="w-5 h-5" /><span className="font-medium">Back</span>
      </button>

      <div className="relative z-10 max-w-md w-full">
        <div className="p-10 rounded-[24px] bg-white border border-gray-200 shadow-[0_8px_30px_rgba(0,0,0,0.04)]">
          <div className="mb-8">
            <h1 className="text-3xl font-normal tracking-tight text-[#17191F] mb-2">Caregiver Access</h1>
            <p className="text-gray-500 text-lg">{isSignUp ? "Create your account to get started" : "Sign in to manage care"}</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {isSignUp && (
              <>
                <div>
                  <label className="block mb-2 text-sm font-medium text-gray-500">Your Name</label>
                  <input type="text" value={name} onChange={(e) => setName(e.target.value)} className="w-full px-5 py-4 rounded-xl bg-[#F6F7FA] border border-gray-200 focus:outline-none focus:ring-1 focus:ring-[#17191F] transition-all text-[#17191F]" placeholder="Your name" />
                </div>
                <div>
                  <label className="block mb-2 text-sm font-medium text-gray-500">Patient Name</label>
                  <input type="text" value={patientName} onChange={(e) => setPatientName(e.target.value)} className="w-full px-5 py-4 rounded-xl bg-[#F6F7FA] border border-gray-200 focus:outline-none focus:ring-1 focus:ring-[#17191F] transition-all text-[#17191F]" placeholder="Enter patient's name" required />
                </div>
              </>
            )}

            <div>
              <label className="block mb-2 text-sm font-medium text-gray-500">Email</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full px-5 py-4 rounded-xl bg-[#F6F7FA] border border-gray-200 focus:outline-none focus:ring-1 focus:ring-[#17191F] transition-all text-[#17191F]" placeholder="your@email.com" required />
            </div>

            <div>
              <label className="block mb-2 text-sm font-medium text-gray-500">Password</label>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full px-5 py-4 rounded-xl bg-[#F6F7FA] border border-gray-200 focus:outline-none focus:ring-1 focus:ring-[#17191F] transition-all text-[#17191F]" placeholder="••••••••" required />
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3">
                <p className="text-red-600 text-sm">{error}</p>
              </div>
            )}

            <button type="submit" disabled={loading} className="w-full py-4 rounded-full bg-[#17191F] text-white hover:scale-[1.02] transition-transform font-medium text-lg shadow-lg shadow-black/10 disabled:opacity-50">
              {loading ? "Please wait..." : isSignUp ? "Create Account" : "Log In"}
            </button>
          </form>

          <div className="mt-6 text-center">
            <button onClick={() => { setIsSignUp(!isSignUp); setError(""); }} className="text-sm text-gray-400 hover:text-[#17191F] transition-colors">
              {isSignUp ? "Already have an account? Log in" : "Need an account? Create one"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
