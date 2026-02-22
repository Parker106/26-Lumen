import { useState, useEffect } from "react";
import { motion } from "motion/react";
import { ArrowLeft } from "lucide-react";

interface FamilyAccessEntryProps {
  onBack: () => void;
  onSubmit: (role: string, code: string) => void;
  error?: string;
}

const ROLES = [
  { value: "son", label: "Son" },
  { value: "daughter", label: "Daughter" },
  { value: "friend", label: "Friend" },
  { value: "neighbor", label: "Neighbor" },
];

export function FamilyAccessEntry({ onBack, onSubmit, error }: FamilyAccessEntryProps) {
  const [selectedRole, setSelectedRole] = useState("");
  const [code, setCode] = useState(["", "", "", "", "", ""]);

  // Reset code when error changes (wrong code entered)
  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => {
        setCode(["", "", "", "", "", ""]);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [error]);

  const handleDigitClick = (digit: string) => {
    const currentIndex = code.findIndex((c) => c === "");
    if (currentIndex !== -1) {
      const newCode = [...code];
      newCode[currentIndex] = digit;
      setCode(newCode);
      
      // Auto-submit when all digits are entered and role is selected
      if (currentIndex === 5 && selectedRole) {
        setTimeout(() => {
          onSubmit(selectedRole, newCode.join(""));
        }, 200);
      }
    }
  };

  const handleBackspace = () => {
    const lastFilledIndex = code.lastIndexOf(
      code.filter((c) => c !== "").slice(-1)[0]
    );
    if (lastFilledIndex !== -1) {
      const newCode = [...code];
      newCode[lastFilledIndex] = "";
      setCode(newCode);
    }
  };

  const handleClear = () => {
    setCode(["", "", "", "", "", ""]);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-8 relative overflow-hidden">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#0F1220] via-[#121826] to-[#1A1535] pointer-events-none" />
      
      {/* Subtle ambient glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-[#7C6FD8] opacity-5 blur-[120px] rounded-full pointer-events-none" />

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
        className="relative z-10 max-w-lg w-full text-center"
      >
        <div className="mb-12">
          <h1 className="text-4xl mb-3">Family & Friends Access</h1>
          <p className="text-xl text-muted-foreground mb-1">Access granted by the caretaker</p>
          <p className="text-sm text-muted-foreground/70">No account needed</p>
        </div>

        {/* Role selection */}
        <div className="mb-10">
          <label className="block mb-4 text-lg text-left">Your relationship</label>
          <div className="grid grid-cols-2 gap-3">
            {ROLES.map((role) => (
              <button
                key={role.value}
                onClick={() => setSelectedRole(role.value)}
                className={`py-4 px-6 rounded-xl border-2 transition-all ${
                  selectedRole === role.value
                    ? "border-secondary bg-secondary/20 text-foreground"
                    : "border-border bg-card/50 text-muted-foreground hover:border-secondary/50 hover:text-foreground"
                }`}
              >
                {role.label}
              </button>
            ))}
          </div>
        </div>

        {/* Code dots */}
        <div className="mb-4">
          <label className="block mb-4 text-lg text-left">Patient access code</label>
          <div className="flex justify-center gap-4 mb-4">
            {code.map((digit, index) => (
              <motion.div
                key={index}
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: index * 0.05 }}
                className={`w-14 h-14 rounded-2xl flex items-center justify-center border-2 transition-all duration-300 ${
                  digit
                    ? error 
                      ? "border-destructive bg-destructive/20" 
                      : "border-secondary bg-secondary/20"
                    : error
                      ? "border-destructive/50 bg-card/50"
                      : "border-border bg-card/50"
                }`}
              >
                {digit && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="text-xl"
                  >
                    {digit}
                  </motion.div>
                )}
              </motion.div>
            ))}
          </div>

          {/* Error message */}
          {error && (
            <motion.p
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-destructive mb-4"
            >
              {error}
            </motion.p>
          )}
        </div>

        {/* Numeric keypad */}
        <div className="max-w-sm mx-auto">
          <div className="grid grid-cols-3 gap-4 mb-4">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
              <motion.button
                key={num}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => handleDigitClick(num.toString())}
                disabled={!selectedRole}
                className="h-16 rounded-xl bg-card backdrop-blur-xl border border-border hover:border-secondary/50 transition-all text-xl disabled:opacity-30 disabled:cursor-not-allowed"
              >
                {num}
              </motion.button>
            ))}
          </div>

          <div className="grid grid-cols-3 gap-4">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleClear}
              disabled={!selectedRole}
              className="h-16 rounded-xl bg-card backdrop-blur-xl border border-border hover:border-destructive/50 transition-all text-sm disabled:opacity-30 disabled:cursor-not-allowed"
            >
              Clear
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => handleDigitClick("0")}
              disabled={!selectedRole}
              className="h-16 rounded-xl bg-card backdrop-blur-xl border border-border hover:border-secondary/50 transition-all text-xl disabled:opacity-30 disabled:cursor-not-allowed"
            >
              0
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleBackspace}
              disabled={!selectedRole}
              className="h-16 rounded-xl bg-card backdrop-blur-xl border border-border hover:border-muted-foreground/50 transition-all text-sm disabled:opacity-30 disabled:cursor-not-allowed"
            >
              ←
            </motion.button>
          </div>
        </div>

        {!selectedRole && (
          <p className="mt-6 text-sm text-muted-foreground">
            Please select your relationship first
          </p>
        )}
      </motion.div>
    </div>
  );
}
