import { motion } from "motion/react";
import { Heart, Users, Shield, Mic } from "lucide-react";

interface LandingPageProps {
  onSelectMode: (mode: "patient" | "family" | "caretaker") => void;
}

export function LandingPage({ onSelectMode }: LandingPageProps) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 relative overflow-hidden">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#0F1220] via-[#121826] to-[#1A1535] pointer-events-none" />
      
      {/* Ambient glow behind main button */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-primary opacity-10 blur-[150px] rounded-full pointer-events-none" />

      {/* Main Content - Patient Focused */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="relative z-10 flex flex-col items-center text-center mb-16"
      >
        {/* Friendly Greeting */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2, duration: 0.6 }}
          className="mb-10"
        >
          <p className="text-xl text-muted-foreground/70 mb-3 tracking-wide">Hello, I am</p>
          <h1 className="mb-5 font-light tracking-tight text-white" style={{ fontSize: '8rem' }}>
            Lumen
          </h1>
          <p className="text-xl md:text-2xl text-muted-foreground max-w-md mx-auto leading-relaxed">
            Your personal voice assistant
          </p>
        </motion.div>

        {/* Big Friendly Press to Speak Button */}
        <motion.button
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.4, duration: 0.5 }}
          onClick={() => onSelectMode("patient")}
          className="group w-40 h-40 md:w-48 md:h-48 rounded-full bg-transparent border-2 border-white/20 hover:border-white/40 flex flex-col items-center justify-center transition-all duration-300"
        >
          <Mic className="w-12 h-12 md:w-14 md:h-14 text-white/80 group-hover:text-white mb-2 transition-colors" />
          <span className="text-white/70 group-hover:text-white text-base md:text-lg font-light tracking-wide transition-colors">Press to Speak</span>
        </motion.button>

        {/* Reassuring text */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.7, duration: 0.5 }}
          className="mt-6 text-lg text-muted-foreground/50 max-w-sm"
        >
          Tap the button above to talk with me
        </motion.p>
      </motion.div>

      {/* Secondary Options - Smaller, at bottom */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.8, duration: 0.5 }}
        className="relative z-10 w-full max-w-md"
      >
        <div className="border-t border-border/30 pt-6 mb-4">
          <p className="text-sm text-muted-foreground/60 text-center mb-4">
            For family members & caretakers
          </p>
        </div>
        
        <div className="flex gap-3 justify-center">
          {/* Family & Friends - Smaller */}
          <button
            onClick={() => onSelectMode("family")}
            className="flex items-center gap-2 px-4 py-3 rounded-xl bg-card/50 backdrop-blur border border-border/50 hover:border-secondary/50 hover:bg-secondary/10 transition-all duration-300 text-sm"
          >
            <Users className="w-4 h-4 text-secondary" />
            <span className="text-muted-foreground hover:text-foreground">Family & Friends</span>
          </button>

          {/* Caretaker Login - Smaller */}
          <button
            onClick={() => onSelectMode("caretaker")}
            className="flex items-center gap-2 px-4 py-3 rounded-xl bg-card/50 backdrop-blur border border-border/50 hover:border-accent/50 hover:bg-accent/10 transition-all duration-300 text-sm"
          >
            <Shield className="w-4 h-4 text-accent" />
            <span className="text-muted-foreground hover:text-foreground">Caretaker Login</span>
          </button>
        </div>
      </motion.div>
    </div>
  );
}
