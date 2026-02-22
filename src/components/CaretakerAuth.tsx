import { useState } from "react";
import { motion } from "motion/react";
import { ArrowLeft } from "lucide-react";
import { getCaretakerCredentials } from "../lib/storage";

interface CaretakerAuthProps {
  onBack: () => void;
  onLogin: (email: string, password: string, isSignUp: boolean, patientName?: string) => boolean;
}

export function CaretakerAuth({ onBack, onLogin }: CaretakerAuthProps) {
  const [isSignUp, setIsSignUp] = useState(() => {
    // Default to signup if no account exists
    return !getCaretakerCredentials();
  });
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [patientName, setPatientName] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    // Basic validation
    if (!email.trim() || !password.trim()) {
      setError("Please fill in all required fields.");
      return;
    }

    if (isSignUp && !patientName.trim()) {
      setError("Please enter the patient's name.");
      return;
    }

    if (password.length < 4) {
      setError("Password must be at least 4 characters.");
      return;
    }

    const success = onLogin(email, password, isSignUp, patientName || undefined);
    
    if (!success) {
      if (isSignUp) {
        setError("Failed to create account. Please try again.");
      } else {
        // Check if account exists
        const credentials = getCaretakerCredentials();
        if (!credentials) {
          setError("No account found. Please sign up first.");
        } else {
          setError("Invalid email or password.");
        }
      }
    }
  };

  const handleToggleMode = () => {
    setIsSignUp(!isSignUp);
    setError("");
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-8 relative overflow-hidden">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#0F1220] via-[#121826] to-[#1A1535] pointer-events-none" />
      
      {/* Subtle ambient glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-[#E09850] opacity-5 blur-[120px] rounded-full pointer-events-none" />

      {/* Back button */}
      <motion.button
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        onClick={onBack}
        className="absolute top-8 left-8 flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="w-5 h-5" />
        Back
      </motion.button>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative z-10 max-w-md w-full"
      >
        {/* Card */}
        <div className="p-10 rounded-2xl bg-card backdrop-blur-xl border border-border">
          <div className="mb-8">
            <h1 className="text-3xl mb-2">Caretaker Access</h1>
            <p className="text-muted-foreground">
              {isSignUp ? "Create your account to get started" : "Sign in to manage care"}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {isSignUp && (
              <div>
                <label className="block mb-2 text-sm">Patient Name</label>
                <input
                  type="text"
                  value={patientName}
                  onChange={(e) => setPatientName(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-input border border-border focus:border-accent focus:outline-none transition-colors"
                  placeholder="Enter patient's name"
                  required={isSignUp}
                />
              </div>
            )}

            <div>
              <label className="block mb-2 text-sm">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-input border border-border focus:border-accent focus:outline-none transition-colors"
                placeholder="your@email.com"
                required
              />
            </div>

            <div>
              <label className="block mb-2 text-sm">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-input border border-border focus:border-accent focus:outline-none transition-colors"
                placeholder="••••••••"
                required
              />
            </div>

            {error && (
              <motion.p
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-destructive text-sm"
              >
                {error}
              </motion.p>
            )}

            <button
              type="submit"
              className="w-full py-3 rounded-xl bg-accent text-accent-foreground hover:bg-accent/90 transition-colors"
            >
              {isSignUp ? "Create Account" : "Log In"}
            </button>
          </form>

          <div className="mt-6 text-center">
            <button
              onClick={handleToggleMode}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              {isSignUp
                ? "Already have an account? Log in"
                : "Need an account? Create one"}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
