import { useState, useEffect } from "react";
import { motion } from "motion/react";
import { ArrowLeft, Send, LogOut, Clock, Calendar, User, MapPin, CalendarClock } from "lucide-react";
import { addMessage, getRoutines, type Routine } from "../lib/storage";

interface FamilyMessageProps {
  onBack: () => void;
  onLogout: () => void;
  patientName: string;
  senderRole: string;
}

const MAX_MESSAGE_LENGTH = 240;

export function FamilyMessage({ onBack, onLogout, patientName, senderRole }: FamilyMessageProps) {
  const [message, setMessage] = useState("");
  const [senderName, setSenderName] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const [routines, setRoutines] = useState<Routine[]>([]);
  const [activeTab, setActiveTab] = useState<"message" | "schedule">("message");
  
  // Optional location fields
  const [includeLocation, setIncludeLocation] = useState(false);
  const [location, setLocation] = useState("");
  const [estimatedReturn, setEstimatedReturn] = useState("");

  // Load routines on mount
  useEffect(() => {
    setRoutines(getRoutines());
  }, []);

  const handleSend = () => {
    setError("");
    
    // Validate name
    const trimmedName = senderName.trim();
    if (!trimmedName) {
      setError("Please enter your name.");
      return;
    }
    
    // Validate message
    const trimmedMessage = message.trim();
    if (!trimmedMessage) {
      setError("Please write a message before sending.");
      return;
    }

    if (trimmedMessage.length > MAX_MESSAGE_LENGTH) {
      setError(`Message is too long. Maximum ${MAX_MESSAGE_LENGTH} characters.`);
      return;
    }

    // Validate location fields if location is enabled
    const trimmedLocation = location.trim();
    const trimmedReturn = estimatedReturn.trim();
    
    if (includeLocation && trimmedLocation && !trimmedReturn) {
      setError("Please enter when you'll be back if adding a location.");
      return;
    }

    // Save message to localStorage with name and optional location (pending approval)
    const formattedRole = senderRole.charAt(0).toUpperCase() + senderRole.slice(1);
    addMessage(
      formattedRole, 
      trimmedName, 
      trimmedMessage,
      includeLocation && trimmedLocation ? trimmedLocation : undefined,
      includeLocation && trimmedReturn ? trimmedReturn : undefined
    );

    // Show success state
    setSent(true);
    setTimeout(() => {
      setMessage("");
      setSenderName("");
      setLocation("");
      setEstimatedReturn("");
      setIncludeLocation(false);
      setSent(false);
    }, 3000);
  };

  const handleMessageChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    if (value.length <= MAX_MESSAGE_LENGTH + 10) { // Allow a bit over for visual feedback
      setMessage(value);
      setError("");
    }
  };

  const charactersRemaining = MAX_MESSAGE_LENGTH - message.length;

  return (
    <div className="min-h-screen flex flex-col p-8 relative overflow-hidden">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#0F1220] via-[#121826] to-[#1A1535] pointer-events-none" />
      
      {/* Subtle ambient glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-[#7C6FD8] opacity-5 blur-[120px] rounded-full pointer-events-none" />

      {/* Header */}
      <div className="relative z-10 flex items-center justify-between mb-8">
        {/* Back button */}
        <motion.button
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          onClick={onBack}
          className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          Back
        </motion.button>

        {/* Role indicator */}
        <div className="text-center">
          <p className="text-sm text-muted-foreground">Logged in as</p>
          <p className="text-foreground capitalize">{senderRole}</p>
        </div>

        {/* Logout button */}
        <motion.button
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          onClick={onLogout}
          className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors text-sm"
        >
          <LogOut className="w-4 h-4" />
          Logout
        </motion.button>
      </div>

      {/* Main content */}
      <div className="relative z-10 flex-1 flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="max-w-2xl w-full"
        >
          {/* Tab navigation */}
          <div className="flex gap-2 mb-6">
            <button
              onClick={() => setActiveTab("message")}
              className={`flex items-center gap-2 px-5 py-3 rounded-xl transition-all ${
                activeTab === "message"
                  ? "bg-secondary text-secondary-foreground"
                  : "bg-card/50 backdrop-blur-xl border border-border text-muted-foreground hover:text-foreground"
              }`}
            >
              <Send className="w-4 h-4" />
              Send Message
            </button>
            <button
              onClick={() => setActiveTab("schedule")}
              className={`flex items-center gap-2 px-5 py-3 rounded-xl transition-all ${
                activeTab === "schedule"
                  ? "bg-secondary text-secondary-foreground"
                  : "bg-card/50 backdrop-blur-xl border border-border text-muted-foreground hover:text-foreground"
              }`}
            >
              <Calendar className="w-4 h-4" />
              Today's Schedule
            </button>
          </div>

          {/* Message Tab */}
          {activeTab === "message" && (
            <div className="p-10 rounded-2xl bg-card backdrop-blur-xl border border-border">
              <div className="mb-8">
                <h1 className="text-3xl mb-3">Send a Message</h1>
                <p className="text-xl text-muted-foreground">
                  Messages are spoken gently to {patientName}
                </p>
              </div>

              {sent ? (
                <motion.div
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="py-16 text-center"
                >
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.2, type: "spring" }}
                    className="w-20 h-20 rounded-full bg-primary/20 flex items-center justify-center mx-auto mb-6"
                  >
                    <Send className="w-10 h-10 text-primary" />
                  </motion.div>
                  <p className="text-2xl mb-2">Message sent!</p>
                  <p className="text-muted-foreground">
                    Your message is pending caretaker approval.
                    <br />
                    {patientName} will hear it once approved.
                  </p>
                </motion.div>
              ) : (
                <>
                  {/* Name input */}
                  <div className="mb-6">
                    <label className="block text-sm text-muted-foreground mb-3">Your Name</label>
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl bg-secondary/20 flex items-center justify-center flex-shrink-0">
                        <User className="w-5 h-5 text-secondary" />
                      </div>
                      <input
                        type="text"
                        value={senderName}
                        onChange={(e) => setSenderName(e.target.value)}
                        placeholder={`e.g., Sarah, Michael, John...`}
                        className="flex-1 px-5 py-4 rounded-xl bg-input border border-border focus:border-secondary focus:outline-none transition-colors text-lg"
                        maxLength={50}
                      />
                    </div>
                    <p className="text-sm text-muted-foreground/70 mt-3">
                      Your name will be spoken when {patientName} hears your message
                    </p>
                  </div>

                  {/* Message input */}
                  <div className="mb-6">
                    <label className="block text-sm text-muted-foreground mb-3">Your Message</label>
                    <textarea
                      value={message}
                      onChange={handleMessageChange}
                      placeholder="Write something calm and reassuring..."
                      className="w-full h-48 px-5 py-4 rounded-xl bg-input border border-border focus:border-secondary focus:outline-none transition-colors resize-none text-lg leading-relaxed"
                    />
                    <div className="mt-3 flex items-center justify-between">
                      <p className="text-sm text-muted-foreground">
                        Keep it simple, warm, and positive
                      </p>
                      <p className={`text-sm ${charactersRemaining < 0 ? 'text-destructive' : charactersRemaining < 40 ? 'text-yellow-500' : 'text-muted-foreground'}`}>
                        {charactersRemaining} characters remaining
                      </p>
                    </div>
                  </div>

                  {/* Optional Location Section */}
                  <div className="mb-6">
                    <button
                      type="button"
                      onClick={() => setIncludeLocation(!includeLocation)}
                      className={`flex items-center gap-3 px-4 py-3 rounded-xl border transition-all w-full ${
                        includeLocation 
                          ? 'bg-accent/20 border-accent text-accent-foreground' 
                          : 'bg-card/50 border-border text-muted-foreground hover:text-foreground hover:border-accent/50'
                      }`}
                    >
                      <MapPin className={`w-5 h-5 ${includeLocation ? 'text-accent' : ''}`} />
                      <span className="flex-1 text-left">Add your current location (optional)</span>
                      <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                        includeLocation ? 'bg-accent border-accent' : 'border-muted-foreground'
                      }`}>
                        {includeLocation && <span className="text-white text-xs">✓</span>}
                      </div>
                    </button>
                    
                    {includeLocation && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="mt-4 space-y-4 pl-4 border-l-2 border-accent/30"
                      >
                        <div>
                          <label className="block text-sm text-muted-foreground mb-2">Where are you?</label>
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-accent/20 flex items-center justify-center flex-shrink-0">
                              <MapPin className="w-4 h-4 text-accent" />
                            </div>
                            <input
                              type="text"
                              value={location}
                              onChange={(e) => setLocation(e.target.value)}
                              placeholder="e.g., New York for a business trip, At the hospital..."
                              className="flex-1 px-4 py-3 rounded-xl bg-input border border-border focus:border-accent focus:outline-none transition-colors"
                              maxLength={100}
                            />
                          </div>
                        </div>
                        
                        <div>
                          <label className="block text-sm text-muted-foreground mb-2">When will you be back?</label>
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-accent/20 flex items-center justify-center flex-shrink-0">
                              <CalendarClock className="w-4 h-4 text-accent" />
                            </div>
                            <input
                              type="text"
                              value={estimatedReturn}
                              onChange={(e) => setEstimatedReturn(e.target.value)}
                              placeholder="e.g., Tomorrow evening, In 2 days, Friday afternoon..."
                              className="flex-1 px-4 py-3 rounded-xl bg-input border border-border focus:border-accent focus:outline-none transition-colors"
                              maxLength={100}
                            />
                          </div>
                        </div>
                        
                        <p className="text-sm text-muted-foreground/70">
                          {patientName} can ask "Where is my {senderRole.toLowerCase()}?" and Lumen will share this info.
                        </p>
                      </motion.div>
                    )}
                  </div>

                  {error && (
                    <motion.p
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="text-destructive mb-4"
                    >
                      {error}
                    </motion.p>
                  )}

                  <button
                    onClick={handleSend}
                    disabled={!message.trim() || !senderName.trim() || charactersRemaining < 0 || (includeLocation && location.trim() && !estimatedReturn.trim())}
                    className="w-full py-4 rounded-xl bg-secondary text-secondary-foreground hover:bg-secondary/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-lg"
                  >
                    <Send className="w-5 h-5" />
                    Send Message
                  </button>
                </>
              )}
            </div>
          )}

          {/* Schedule Tab */}
          {activeTab === "schedule" && (
            <div className="p-10 rounded-2xl bg-card backdrop-blur-xl border border-border">
              <div className="mb-8">
                <h1 className="text-3xl mb-3">Today's Schedule</h1>
                <p className="text-xl text-muted-foreground">
                  {patientName}'s daily routines
                </p>
              </div>

              {routines.length === 0 ? (
                <div className="py-12 text-center">
                  <Clock className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-xl text-muted-foreground">No routines scheduled</p>
                  <p className="text-sm text-muted-foreground/70 mt-2">
                    The caretaker can add routines from the dashboard
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {routines
                    .sort((a, b) => a.time.localeCompare(b.time))
                    .map((routine) => {
                      // Check if routine time has passed
                      const now = new Date();
                      const [hours, minutes] = routine.time.split(':').map(Number);
                      const routineTime = new Date();
                      routineTime.setHours(hours, minutes, 0, 0);
                      const isPast = now > routineTime;

                      return (
                        <div
                          key={routine.id}
                          className={`p-5 rounded-xl border transition-colors flex items-center gap-4 ${
                            isPast
                              ? "bg-muted/10 border-border/50 opacity-60"
                              : "bg-card/50 border-border hover:border-secondary/30"
                          }`}
                        >
                          <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${
                            isPast ? "bg-muted/20" : "bg-secondary/20"
                          }`}>
                            <Clock className={`w-6 h-6 ${isPast ? "text-muted-foreground" : "text-secondary"}`} />
                          </div>
                          <div className="flex-1">
                            <p className={`font-medium mb-1 ${isPast ? "line-through" : ""}`}>
                              {routine.label}
                            </p>
                            <p className="text-sm text-muted-foreground">{routine.time}</p>
                          </div>
                        </div>
                      );
                    })}
                </div>
              )}
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
