import { useState, useEffect, useRef, useCallback } from "react";
import { motion } from "motion/react";
import { ArrowLeft, Mic, MicOff } from "lucide-react";
import {
  isSpeechRecognitionSupported,
  startListening,
  stopListening,
  speak,
  stopSpeaking,
  generateLumenResponse,
  type LumenContext,
} from "../lib/voice";
import { addLog, getRoutines, getApprovedMessages, getPatientName } from "../lib/storage";

interface PatientVoiceProps {
  onBack: () => void;
  patientName?: string;
}

export function PatientVoice({ onBack, patientName: propPatientName }: PatientVoiceProps) {
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [lumenResponse, setLumenResponse] = useState("");
  const [status, setStatus] = useState("Tap to speak");
  const [error, setError] = useState("");
  const [isSupported, setIsSupported] = useState(true);

  // Load context from localStorage
  const [context, setContext] = useState<LumenContext>({
    patientName: propPatientName || getPatientName(),
    routines: [],
    messages: [],
  });

  const recognitionRef = useRef<SpeechRecognition | null>(null);

  // Load context on mount and refresh periodically
  useEffect(() => {
    const loadContext = () => {
      setContext({
        patientName: propPatientName || getPatientName(),
        routines: getRoutines(),
        messages: getApprovedMessages(), // Only approved messages
      });
    };

    loadContext();
    
    // Refresh context every 30 seconds to catch new messages
    const interval = setInterval(loadContext, 30000);
    return () => clearInterval(interval);
  }, [propPatientName]);

  // Check browser support on mount and deliver welcome message
  useEffect(() => {
    const supported = isSpeechRecognitionSupported();
    setIsSupported(supported);
    if (!supported) {
      setError("Voice input requires Chrome browser.");
    } else {
      // Build comprehensive welcome message for dementia patient
      const patientName = propPatientName || getPatientName();
      const routines = getRoutines();
      const messages = getApprovedMessages();
      
      // Build the routine schedule part
      let scheduleText = "";
      if (routines.length > 0) {
        const sortedRoutines = [...routines].sort((a, b) => a.time.localeCompare(b.time));
        const routineList = sortedRoutines.map(r => {
          const [hours, minutes] = r.time.split(':').map(Number);
          const period = hours >= 12 ? 'PM' : 'AM';
          const hour12 = hours % 12 || 12;
          const timeStr = minutes === 0 ? `${hour12} ${period}` : `${hour12}:${minutes.toString().padStart(2, '0')} ${period}`;
          return `At ${timeStr}, ${r.label}`;
        }).join('. ');
        scheduleText = ` Here's your schedule for today: ${routineList}.`;
      } else {
        scheduleText = " You don't have any scheduled activities today. It's a relaxing day.";
      }
      
      // Build the messages part
      let messagesText = "";
      if (messages.length > 0) {
        const uniqueSenders = [...new Set(messages.map(m => m.fromName))];
        if (uniqueSenders.length === 1) {
          messagesText = ` You have a message from ${uniqueSenders[0]}. Just ask me to read it.`;
        } else {
          messagesText = ` You have ${messages.length} messages from loved ones. Just ask me to read them.`;
        }
      }
      
      // Full welcome greeting
      const greeting = `Hello ${patientName}! Your name is ${patientName}, and you are safe at home. I'm Lumen, your voice companion. I'm here to help you throughout the day.${scheduleText}${messagesText} You can tap the circle anytime to talk to me. You can ask me about your schedule, messages from family, or just chat.`;
      
      setLumenResponse(greeting);
      speak(greeting, () => setIsSpeaking(false), 0.9);
      setIsSpeaking(true);
    }

    // Cleanup on unmount
    return () => {
      stopListening(recognitionRef.current);
      stopSpeaking();
    };
  }, []);

  const handleStartListening = useCallback(() => {
    if (!isSupported) {
      setError("Voice input requires Chrome browser.");
      return;
    }

    if (isSpeaking) {
      stopSpeaking();
      setIsSpeaking(false);
    }

    setError("");
    setTranscript("");
    setStatus("Listening...");
    setIsListening(true);

    recognitionRef.current = startListening(
      // On result
      (text, isFinal) => {
        setTranscript(text);
        if (isFinal) {
          // Generate and speak response using context
          const response = generateLumenResponse(text, context);
          setLumenResponse(response);
          setStatus("Speaking...");
          setIsListening(false);
          setIsSpeaking(true);

          // Log the conversation
          addLog(text, response);

          // Speak the response
          speak(
            response,
            () => {
              setIsSpeaking(false);
              setStatus("Tap to speak");
            },
            0.9
          );
        }
      },
      // On end
      () => {
        setIsListening(false);
        if (!isSpeaking) {
          setStatus("Tap to speak");
        }
      },
      // On error
      (errorMsg) => {
        setError(errorMsg);
        setIsListening(false);
        setStatus("Tap to speak");
      }
    );
  }, [isSupported, isSpeaking, context]);

  const handleStopListening = useCallback(() => {
    stopListening(recognitionRef.current);
    recognitionRef.current = null;
    setIsListening(false);
    setStatus("Tap to speak");
  }, []);

  const handleCircleClick = () => {
    if (isListening) {
      handleStopListening();
    } else {
      handleStartListening();
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-8 relative overflow-hidden">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#0F1220] via-[#121826] to-[#1A1535] pointer-events-none" />

      {/* Back button - subtle and non-distracting */}
      <motion.button
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        onClick={onBack}
        className="absolute top-8 left-8 flex items-center gap-2 text-muted-foreground/40 hover:text-muted-foreground/60 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        <span className="text-sm">Back</span>
      </motion.button>

      {/* Patient name display */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="absolute top-8 right-8 text-right"
      >
        <p className="text-xs text-muted-foreground/50">Patient</p>
        <p className="text-sm text-muted-foreground/70">{context.patientName}</p>
      </motion.div>

      {/* Browser support warning */}
      {!isSupported && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="absolute top-20 left-1/2 -translate-x-1/2 px-6 py-3 rounded-xl bg-destructive/20 border border-destructive/50 text-destructive"
        >
          Voice input requires Chrome browser
        </motion.div>
      )}

      {/* Ambient breathing effect */}
      <motion.div
        animate={{
          scale: [1, 1.2, 1],
          opacity: [0.03, 0.08, 0.03],
        }}
        transition={{
          duration: 4,
          repeat: Infinity,
          ease: "easeInOut",
        }}
        className="absolute inset-0 flex items-center justify-center pointer-events-none"
      >
        <div className="w-[800px] h-[800px] bg-primary rounded-full blur-[150px]" />
      </motion.div>

      <div className="relative z-10 flex flex-col items-center max-w-3xl">
        {/* Voice pulse animation */}
        <button
          onClick={handleCircleClick}
          disabled={!isSupported || isSpeaking}
          className="relative mb-16 focus:outline-none disabled:cursor-not-allowed"
        >
          {/* Outer ripples - only show when listening */}
          {isListening && (
            <>
              <motion.div
                animate={{
                  scale: [1, 1.8, 1],
                  opacity: [0.4, 0, 0.4],
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  ease: "easeOut",
                }}
                className="absolute inset-0 rounded-full border-4 border-primary"
                style={{ width: "320px", height: "320px", left: "-80px", top: "-80px" }}
              />
              <motion.div
                animate={{
                  scale: [1, 1.5, 1],
                  opacity: [0.5, 0, 0.5],
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  ease: "easeOut",
                  delay: 0.3,
                }}
                className="absolute inset-0 rounded-full border-4 border-primary"
                style={{ width: "240px", height: "240px", left: "-40px", top: "-40px" }}
              />
            </>
          )}

          {/* Speaking animation */}
          {isSpeaking && (
            <motion.div
              animate={{
                scale: [1, 1.15, 1],
                opacity: [0.6, 0.3, 0.6],
              }}
              transition={{
                duration: 1.5,
                repeat: Infinity,
                ease: "easeInOut",
              }}
              className="absolute inset-0 rounded-full border-4 border-secondary"
              style={{ width: "200px", height: "200px", left: "-20px", top: "-20px" }}
            />
          )}

          {/* Center circle */}
          <motion.div
            animate={{
              scale: isListening ? [1, 1.1, 1] : isSpeaking ? [1, 1.05, 1] : [1, 1.02, 1],
            }}
            transition={{
              duration: isListening ? 1 : 2,
              repeat: Infinity,
              ease: "easeInOut",
            }}
            className={`w-40 h-40 rounded-full flex items-center justify-center transition-all duration-300 ${
              isListening
                ? "bg-gradient-to-br from-primary to-primary/70"
                : isSpeaking
                ? "bg-gradient-to-br from-secondary to-secondary/70"
                : "bg-gradient-to-br from-primary/80 to-secondary/80 hover:from-primary hover:to-secondary"
            }`}
          >
            <motion.div
              animate={{
                scale: [0.95, 1, 0.95],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: "easeInOut",
              }}
              className="w-32 h-32 rounded-full bg-background/40 backdrop-blur-xl flex items-center justify-center"
            >
              {isListening ? (
                <Mic className="w-10 h-10 text-primary" />
              ) : isSpeaking ? (
                <motion.div
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ duration: 0.5, repeat: Infinity }}
                  className="flex gap-1"
                >
                  <div className="w-2 h-8 bg-secondary rounded-full" />
                  <div className="w-2 h-12 bg-secondary rounded-full" />
                  <div className="w-2 h-6 bg-secondary rounded-full" />
                </motion.div>
              ) : (
                <MicOff className="w-8 h-8 text-muted-foreground" />
              )}
            </motion.div>
          </motion.div>
        </button>

        {/* Status */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="mb-8"
        >
          <p className={`text-3xl text-center ${isListening ? "text-primary" : isSpeaking ? "text-secondary" : ""}`}>
            {status}
          </p>
        </motion.div>

        {/* Error message */}
        {error && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-destructive mb-4 text-center"
          >
            {error}
          </motion.p>
        )}

        {/* Transcription / Response area */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4 }}
          className="w-full max-w-2xl space-y-4"
        >
          {/* User transcript */}
          {transcript && (
            <div className="p-6 rounded-2xl bg-card/30 backdrop-blur-xl border border-border/50">
              <p className="text-xs text-muted-foreground mb-2">You said:</p>
              <p className="text-xl text-center leading-relaxed">{transcript}</p>
            </div>
          )}

          {/* Lumen response */}
          <div className="p-8 rounded-2xl bg-card/50 backdrop-blur-xl border border-border min-h-[120px] flex flex-col items-center justify-center">
            {lumenResponse ? (
              <>
                <p className="text-xs text-muted-foreground mb-2">Lumen:</p>
                <p className="text-2xl text-center leading-relaxed text-primary/90">{lumenResponse}</p>
              </>
            ) : (
              <p className="text-xl text-center leading-relaxed text-muted-foreground">
                Speak naturally. I'm here to help.
              </p>
            )}
          </div>
        </motion.div>

        {/* Suggested prompts */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.7 }}
          transition={{ delay: 1 }}
          className="mt-8 text-center"
        >
          <p className="text-xs text-muted-foreground/60 mb-2">Try saying:</p>
          <div className="flex flex-wrap justify-center gap-2">
            {["What is my name?", "What's my schedule?", "Read my messages", "Who are you?"].map((prompt) => (
              <span key={prompt} className="text-xs px-3 py-1 rounded-full bg-card/30 text-muted-foreground/50">
                "{prompt}"
              </span>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
