// Voice utility module for Lumen app
// Uses Web Speech API (free, built into Chrome) - NO API KEYS REQUIRED

// Check if speech recognition is supported
export function isSpeechRecognitionSupported(): boolean {
  return 'webkitSpeechRecognition' in window || 'SpeechRecognition' in window;
}

// Check if speech synthesis is supported
export function isSpeechSynthesisSupported(): boolean {
  return 'speechSynthesis' in window;
}

// Types
interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
  resultIndex: number;
}

interface SpeechRecognitionResultList {
  length: number;
  item(index: number): SpeechRecognitionResult;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionResult {
  isFinal: boolean;
  length: number;
  item(index: number): SpeechRecognitionAlternative;
  [index: number]: SpeechRecognitionAlternative;
}

interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
  message: string;
}

// Context for generating responses
export interface LumenContext {
  patientName: string;
  routines: { time: string; label: string }[];
  messages: { fromRole: string; fromName: string; text: string; timestamp: string; location?: string; estimatedReturn?: string }[];
}

// Create speech recognition instance
export function createSpeechRecognition(): SpeechRecognition | null {
  if (!isSpeechRecognitionSupported()) {
    return null;
  }

  const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
  const recognition = new SpeechRecognition();

  // Configure recognition
  recognition.continuous = false; // Stop after one utterance
  recognition.interimResults = true; // Show interim results
  recognition.lang = 'en-US';

  return recognition;
}

// Start listening
export function startListening(
  onResult: (transcript: string, isFinal: boolean) => void,
  onEnd: () => void,
  onError: (error: string) => void
): SpeechRecognition | null {
  const recognition = createSpeechRecognition();
  
  if (!recognition) {
    onError('Speech recognition is not supported in this browser. Please use Chrome.');
    return null;
  }

  recognition.onresult = (event: SpeechRecognitionEvent) => {
    let finalTranscript = '';
    let interimTranscript = '';

    for (let i = event.resultIndex; i < event.results.length; i++) {
      const result = event.results[i];
      if (result.isFinal) {
        finalTranscript += result[0].transcript;
      } else {
        interimTranscript += result[0].transcript;
      }
    }

    if (finalTranscript) {
      onResult(finalTranscript, true);
    } else if (interimTranscript) {
      onResult(interimTranscript, false);
    }
  };

  recognition.onend = () => {
    onEnd();
  };

  recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
    if (event.error === 'no-speech') {
      onError("I didn't hear anything. Tap to try again.");
    } else if (event.error === 'audio-capture') {
      onError('No microphone found. Please check your microphone.');
    } else if (event.error === 'not-allowed') {
      onError('Microphone access denied. Please allow microphone access.');
    } else {
      onError(`Error: ${event.error}`);
    }
  };

  try {
    recognition.start();
    return recognition;
  } catch (e) {
    onError('Failed to start speech recognition.');
    return null;
  }
}

// Stop listening
export function stopListening(recognition: SpeechRecognition | null): void {
  if (recognition) {
    try {
      recognition.stop();
    } catch (e) {
      // Ignore errors when stopping
    }
  }
}

// Speak text using speech synthesis
export function speak(
  text: string,
  onEnd?: () => void,
  rate: number = 0.9, // Calm pace
  pitch: number = 1.0
): SpeechSynthesisUtterance | null {
  if (!isSpeechSynthesisSupported()) {
    console.warn('Speech synthesis not supported');
    if (onEnd) onEnd();
    return null;
  }

  // Cancel any ongoing speech
  window.speechSynthesis.cancel();

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.rate = rate;
  utterance.pitch = pitch;
  utterance.volume = 1.0;

  // Try to find a nice voice
  const voices = window.speechSynthesis.getVoices();
  const preferredVoices = voices.filter(
    (v) =>
      v.name.includes('Samantha') || // macOS
      v.name.includes('Google') ||   // Chrome
      v.name.includes('Microsoft') || // Windows
      v.lang.startsWith('en')
  );

  if (preferredVoices.length > 0) {
    utterance.voice = preferredVoices[0];
  }

  if (onEnd) {
    utterance.onend = onEnd;
  }

  window.speechSynthesis.speak(utterance);
  return utterance;
}

// Stop speaking
export function stopSpeaking(): void {
  if (isSpeechSynthesisSupported()) {
    window.speechSynthesis.cancel();
  }
}

// Format time for speech (e.g., "08:00" -> "8 AM")
function formatTimeForSpeech(time: string): string {
  const [hours, minutes] = time.split(':').map(Number);
  const period = hours >= 12 ? 'PM' : 'AM';
  const hour12 = hours % 12 || 12;
  if (minutes === 0) {
    return `${hour12} ${period}`;
  }
  return `${hour12}:${minutes.toString().padStart(2, '0')} ${period}`;
}

// Generate a hardcoded Lumen response based on user input with context
export function generateLumenResponse(userText: string, context: LumenContext): string {
  const text = userText.toLowerCase().trim();
  const { patientName, routines, messages } = context;

  // ========== NAME RELATED ==========
  // What is my name / who am i
  if (text.includes('what is my name') || text.includes('who am i') || text.includes("what's my name")) {
    return `Your name is ${patientName}. You are safe and loved.`;
  }

  // Who are you / your name / what's your name
  if (text.includes('who are you') || text.includes('your name') || text.includes("what's your name") || text.includes('what are you')) {
    return `I'm Lumen, your voice companion. I'm here to help you, ${patientName}. You can ask me about your schedule, messages from family, or just talk to me.`;
  }

  // ========== ROUTINE / SCHEDULE RELATED ==========
  // What's my schedule / routine / what do I have today
  if (text.includes('schedule') || text.includes('routine') || text.includes('what do i have') || text.includes('plan for today') || text.includes('what should i do')) {
    if (routines.length === 0) {
      return `${patientName}, you don't have any scheduled routines right now. It's a relaxing day.`;
    }
    
    const sortedRoutines = [...routines].sort((a, b) => a.time.localeCompare(b.time));
    const routineList = sortedRoutines
      .map(r => `At ${formatTimeForSpeech(r.time)}, ${r.label}`)
      .join('. ');
    
    return `Here's your schedule for today, ${patientName}. ${routineList}. Would you like me to remind you when it's time?`;
  }

  // What time is my medication / medicine
  if (text.includes('medication') || text.includes('medicine') || text.includes('pills')) {
    const medicationRoutines = routines.filter(r => 
      r.label.toLowerCase().includes('medication') || r.label.toLowerCase().includes('medicine')
    );
    
    if (medicationRoutines.length > 0) {
      const times = medicationRoutines.map(r => `${formatTimeForSpeech(r.time)} for ${r.label}`).join(', and ');
      return `${patientName}, your medication times are: ${times}. I'll help remind you.`;
    }
    return `I don't see any medication scheduled right now, ${patientName}. Would you like me to remind the caretaker?`;
  }

  // What's next / what should I do now
  if (text.includes("what's next") || text.includes('what now') || text.includes('what should i do now')) {
    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    
    const upcomingRoutines = routines
      .map(r => {
        const [h, m] = r.time.split(':').map(Number);
        return { ...r, minutes: h * 60 + m };
      })
      .filter(r => r.minutes > currentMinutes)
      .sort((a, b) => a.minutes - b.minutes);
    
    if (upcomingRoutines.length > 0) {
      const next = upcomingRoutines[0];
      return `Your next activity is ${next.label} at ${formatTimeForSpeech(next.time)}, ${patientName}. Until then, you can relax.`;
    }
    return `You've completed all your scheduled activities for today, ${patientName}. Great job! You can rest now.`;
  }

  // ========== LOCATION QUERIES ==========
  // Where is my son / where's my daughter / etc.
  if (text.includes('where') && (text.includes('son') || text.includes('daughter') || text.includes('friend') || text.includes('neighbor') || text.includes('husband') || text.includes('wife') || text.includes('spouse'))) {
    // Find which person they're asking about
    let personType = '';
    if (text.includes('son')) personType = 'son';
    else if (text.includes('daughter')) personType = 'daughter';
    else if (text.includes('friend')) personType = 'friend';
    else if (text.includes('neighbor')) personType = 'neighbor';
    else if (text.includes('husband')) personType = 'husband';
    else if (text.includes('wife')) personType = 'wife';
    else if (text.includes('spouse')) personType = 'spouse';
    
    // Find the most recent message from this person that has location info
    const personMessage = messages.find(m => 
      m.fromRole.toLowerCase().includes(personType) && m.location
    );
    
    if (personMessage && personMessage.location) {
      if (personMessage.estimatedReturn) {
        return `Your ${personType} ${personMessage.fromName}'s current location is: ${personMessage.location}. They'll be back ${personMessage.estimatedReturn}.`;
      }
      return `Your ${personType} ${personMessage.fromName}'s current location is: ${personMessage.location}.`;
    }
    
    // No location, but maybe has a message
    const anyMessage = messages.find(m => m.fromRole.toLowerCase().includes(personType));
    if (anyMessage) {
      return `I don't have location information for your ${personType}, ${anyMessage.fromName}, right now, ${patientName}. But they sent you a message recently. Would you like me to read it?`;
    }
    
    return `I don't have any location information for your ${personType} right now, ${patientName}. But I'm sure they're thinking of you.`;
  }

  // ========== MESSAGE RELATED ==========
  // IMPORTANT: Check specific people FIRST, before generic "message" check
  
  // Read message from son
  if (text.includes('son')) {
    const sonMessage = messages.find(m => 
      m.fromRole.toLowerCase().includes('son')
    );
    
    if (sonMessage) {
      return `Here's a message from your son, ${sonMessage.fromName}: "${sonMessage.text}". That's so sweet, ${patientName}.`;
    }
    return `I don't have a message from your son right now, ${patientName}. But I'm sure he's thinking of you.`;
  }

  // Read message from daughter
  if (text.includes('daughter')) {
    const daughterMessage = messages.find(m => 
      m.fromRole.toLowerCase().includes('daughter')
    );
    
    if (daughterMessage) {
      return `Here's a message from your daughter, ${daughterMessage.fromName}: "${daughterMessage.text}". She loves you very much, ${patientName}.`;
    }
    return `I don't have a message from your daughter right now, ${patientName}. But she loves you.`;
  }

  // Read message from friend
  if (text.includes('friend')) {
    const friendMessage = messages.find(m => 
      m.fromRole.toLowerCase().includes('friend')
    );
    
    if (friendMessage) {
      return `Here's a message from your friend, ${friendMessage.fromName}: "${friendMessage.text}". How lovely, ${patientName}.`;
    }
    return `I don't have a message from a friend right now, ${patientName}.`;
  }

  // Read message from neighbor
  if (text.includes('neighbor')) {
    const neighborMessage = messages.find(m => 
      m.fromRole.toLowerCase().includes('neighbor')
    );
    
    if (neighborMessage) {
      return `Here's a message from your neighbor, ${neighborMessage.fromName}: "${neighborMessage.text}". How nice of them, ${patientName}.`;
    }
    return `I don't have a message from your neighbor right now, ${patientName}.`;
  }

  // Read message from spouse/husband/wife
  if (text.includes('spouse') || text.includes('husband') || text.includes('wife')) {
    const spouseMessage = messages.find(m => 
      m.fromRole.toLowerCase().includes('spouse') || 
      m.fromRole.toLowerCase().includes('husband') || 
      m.fromRole.toLowerCase().includes('wife')
    );
    
    if (spouseMessage) {
      return `Here's a message from your ${spouseMessage.fromRole.toLowerCase()}, ${spouseMessage.fromName}: "${spouseMessage.text}". They love you very much, ${patientName}.`;
    }
    return `I don't have a message from your spouse right now, ${patientName}.`;
  }

  // Read all messages / read my messages
  if (text.includes('read') && (text.includes('message') || text.includes('all'))) {
    if (messages.length === 0) {
      return `You don't have any messages right now, ${patientName}.`;
    }
    
    const messageTexts = messages.slice(0, 3).map(m => 
      `From your ${m.fromRole.toLowerCase()}, ${m.fromName}: "${m.text}"`
    ).join('. Next message: ');
    
    return `Here are your messages, ${patientName}. ${messageTexts}`;
  }

  // Generic message check - MUST come AFTER specific person checks
  // Do I have any messages / did anyone message me
  if (text.includes('message') || text.includes('did anyone') || text.includes('any messages')) {
    if (messages.length === 0) {
      return `You don't have any messages right now, ${patientName}. But your family is thinking of you.`;
    }
    
    const latestMessage = messages[0];
    return `Yes ${patientName}, you have ${messages.length} message${messages.length > 1 ? 's' : ''}. The most recent one is from ${latestMessage.fromName}, your ${latestMessage.fromRole.toLowerCase()}. Would you like me to read it? Just say "read message from ${latestMessage.fromRole.toLowerCase()}".`;
  }

  // ========== TIME / DATE ==========
  if (text.includes('what time') || text.includes('the time') || text.includes('current time')) {
    const now = new Date();
    const time = now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
    return `It's ${time}, ${patientName}.`;
  }

  if (text.includes('what day') || text.includes('the date') || text.includes('today') || text.includes('what is today')) {
    const now = new Date();
    const day = now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
    return `Today is ${day}, ${patientName}.`;
  }

  // ========== LOCATION / SAFETY ==========
  if (text.includes('where am i') || text.includes('where is this') || text.includes('what place')) {
    return `You are safe at home, ${patientName}. Everything is okay. I'm right here with you.`;
  }

  // ========== EMOTIONAL SUPPORT ==========
  if (text.includes('help') || text.includes('scared') || text.includes('worried') || text.includes('afraid') || text.includes('anxious')) {
    return `I'm here with you, ${patientName}. Let's take a slow, deep breath together. Breathe in... and breathe out. You're safe. Everything is okay.`;
  }

  if (text.includes('lonely') || text.includes('alone') || text.includes('miss')) {
    return `You're not alone, ${patientName}. I'm here with you, and your family loves you very much. Would you like me to read you a message from them?`;
  }

  if (text.includes('sad') || text.includes('unhappy') || text.includes('crying')) {
    return `It's okay to feel sad sometimes, ${patientName}. I'm here for you. Would you like to hear a message from your family? They love you so much.`;
  }

  if (text.includes('confused') || text.includes("don't understand") || text.includes('lost')) {
    return `It's okay, ${patientName}. You're safe at home. I'm Lumen, your voice companion. I'm here to help you with anything you need.`;
  }

  // ========== GREETINGS ==========
  if (text.includes('hello') || text.includes('hi ') || text === 'hi' || text.includes('good morning')) {
    return `Good morning, ${patientName}! It's lovely to hear from you. How are you feeling today?`;
  }

  if (text.includes('good afternoon')) {
    return `Good afternoon, ${patientName}! I hope you're having a pleasant day. How can I help you?`;
  }

  if (text.includes('good evening') || text.includes('good night')) {
    return `Good evening, ${patientName}. It's getting late. Is there anything you need before you rest?`;
  }

  // ========== NEEDS ==========
  if (text.includes('hungry') || text.includes('food') || text.includes('eat') || text.includes('snack')) {
    const lunchRoutine = routines.find(r => r.label.toLowerCase().includes('lunch') || r.label.toLowerCase().includes('meal'));
    if (lunchRoutine) {
      return `${patientName}, your meal time is at ${formatTimeForSpeech(lunchRoutine.time)}. Would you like a small snack in the meantime?`;
    }
    return `Let me remind someone that you're hungry, ${patientName}. In the meantime, would you like to chat?`;
  }

  if (text.includes('thirsty') || text.includes('water') || text.includes('drink')) {
    return `Staying hydrated is important, ${patientName}. Let me help remind someone to bring you some water.`;
  }

  if (text.includes('tired') || text.includes('sleep') || text.includes('nap') || text.includes('rest')) {
    return `It's okay to rest, ${patientName}. You can close your eyes if you'd like. I'll be right here when you wake up.`;
  }

  if (text.includes('bathroom') || text.includes('restroom') || text.includes('toilet')) {
    return `I'll let someone know you need to use the bathroom, ${patientName}.`;
  }

  // ========== GRATITUDE ==========
  if (text.includes('thank you') || text.includes('thanks')) {
    return `You're very welcome, ${patientName}. I'm always here for you.`;
  }

  // ========== FAREWELL ==========
  if (text.includes('goodbye') || text.includes('bye')) {
    return `Take care, ${patientName}. I'll be right here whenever you need me. Just tap the circle to talk.`;
  }

  // ========== MUSIC / ENTERTAINMENT ==========
  if (text.includes('music') || text.includes('song') || text.includes('sing')) {
    return `I wish I could sing for you, ${patientName}. Maybe we can think of a favorite song together? What kind of music do you like?`;
  }

  if (text.includes('story') || text.includes('tell me')) {
    return `Once upon a time, ${patientName}, there was someone very special who was loved by their whole family. That someone is you. Your family thinks about you every day.`;
  }

  // ========== FAMILY ==========
  if (text.includes('family') || text.includes('loved ones')) {
    return `Your family loves you very much, ${patientName}. Would you like me to read you a message from them?`;
  }

  // ========== HOW ARE YOU / FEELINGS ==========
  if (text.includes('how are you')) {
    return `I'm doing well, thank you for asking, ${patientName}! I'm happy to be here with you. How are you feeling?`;
  }

  if (text.includes('how am i') || text.includes('feel') || text.includes('feeling')) {
    return `That's okay, ${patientName}. Whatever you're feeling is valid. I'm right here with you. Would you like to talk about it?`;
  }

  // ========== REPEAT ==========
  if (text.includes('repeat') || text.includes('say that again') || text.includes('what did you say')) {
    return `Of course, ${patientName}. Just ask me anything and I'll help you.`;
  }

  // ========== DEFAULT RESPONSE ==========
  return `I hear you, ${patientName}. You're safe, and I'm here with you. Is there something specific I can help you with? You can ask about your schedule, messages from family, or just talk to me.`;
}
