// Storage utility module for Lumen app
// All data is persisted in localStorage

// Keys
const KEYS = {
  CARETAKER_EMAIL: 'lumen_caretaker_email',
  CARETAKER_PASSWORD: 'lumen_caretaker_password',
  PATIENT_NAME: 'lumen_patient_name',
  ACCESS_CODE: 'lumen_patient_access_code',
  ROUTINES: 'lumen_routines',
  MESSAGES: 'lumen_messages',
  LOGS: 'lumen_logs',
  PROFILES: 'lumen_profiles',
  FAMILY_SESSION: 'lumen_family_session',
  CARETAKER_LOGGED_IN: 'lumen_caretaker_logged_in',
};

// Types
export interface Routine {
  id: string;
  time: string;
  label: string;
}

export interface Message {
  id: string;
  fromRole: string;
  fromName: string;
  text: string;
  timestamp: string;
  status: 'pending' | 'approved' | 'rejected';
  // Optional location info
  location?: string;
  estimatedReturn?: string;
}

export interface LogEntry {
  id: string;
  userText: string;
  lumenText: string;
  timestamp: string;
}

export interface Profile {
  id: string;
  role: string;
  lastSeenTimestamp: string;
}

export interface FamilySession {
  role: string;
  loggedIn: boolean;
}

// Helper functions
function getItem<T>(key: string, defaultValue: T): T {
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : defaultValue;
  } catch {
    return defaultValue;
  }
}

function setItem<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.error('Failed to save to localStorage:', e);
  }
}

// Caretaker credentials
export function saveCaretakerCredentials(email: string, password: string, patientName?: string): void {
  localStorage.setItem(KEYS.CARETAKER_EMAIL, email);
  localStorage.setItem(KEYS.CARETAKER_PASSWORD, password);
  if (patientName) {
    localStorage.setItem(KEYS.PATIENT_NAME, patientName);
  }
}

export function getCaretakerCredentials(): { email: string; password: string } | null {
  const email = localStorage.getItem(KEYS.CARETAKER_EMAIL);
  const password = localStorage.getItem(KEYS.CARETAKER_PASSWORD);
  if (email && password) {
    return { email, password };
  }
  return null;
}

export function validateCaretakerLogin(email: string, password: string): boolean {
  const stored = getCaretakerCredentials();
  if (!stored) return false;
  return stored.email === email && stored.password === password;
}

export function getPatientName(): string {
  return localStorage.getItem(KEYS.PATIENT_NAME) || 'Margaret';
}

export function setPatientName(name: string): void {
  localStorage.setItem(KEYS.PATIENT_NAME, name);
}

// Caretaker session
export function setCaretakerLoggedIn(loggedIn: boolean): void {
  setItem(KEYS.CARETAKER_LOGGED_IN, loggedIn);
}

export function isCaretakerLoggedIn(): boolean {
  return getItem(KEYS.CARETAKER_LOGGED_IN, false);
}

// Access code
export function getAccessCode(): string {
  const code = localStorage.getItem(KEYS.ACCESS_CODE);
  if (!code) {
    // Generate default code if none exists
    const defaultCode = generateAccessCode();
    setAccessCode(defaultCode);
    return defaultCode;
  }
  return code;
}

export function setAccessCode(code: string): void {
  localStorage.setItem(KEYS.ACCESS_CODE, code);
}

export function generateAccessCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export function validateAccessCode(inputCode: string): boolean {
  const storedCode = getAccessCode();
  return inputCode === storedCode;
}

// Routines
export function getRoutines(): Routine[] {
  return getItem(KEYS.ROUTINES, []);
}

export function setRoutines(routines: Routine[]): void {
  setItem(KEYS.ROUTINES, routines);
}

export function addRoutine(time: string, label: string): Routine {
  const routines = getRoutines();
  const newRoutine: Routine = {
    id: Date.now().toString(),
    time,
    label,
  };
  routines.push(newRoutine);
  setRoutines(routines);
  return newRoutine;
}

export function updateRoutine(id: string, time: string, label: string): void {
  const routines = getRoutines();
  const index = routines.findIndex(r => r.id === id);
  if (index !== -1) {
    routines[index] = { ...routines[index], time, label };
    setRoutines(routines);
  }
}

export function deleteRoutine(id: string): void {
  const routines = getRoutines().filter(r => r.id !== id);
  setRoutines(routines);
}

// Messages
export function getMessages(): Message[] {
  return getItem(KEYS.MESSAGES, []);
}

export function setMessages(messages: Message[]): void {
  setItem(KEYS.MESSAGES, messages);
}

export function addMessage(
  fromRole: string, 
  fromName: string, 
  text: string,
  location?: string,
  estimatedReturn?: string
): Message {
  const messages = getMessages();
  const newMessage: Message = {
    id: Date.now().toString(),
    fromRole,
    fromName,
    text,
    timestamp: new Date().toISOString(),
    status: 'pending', // Messages need caretaker approval
    ...(location && { location }),
    ...(estimatedReturn && { estimatedReturn }),
  };
  messages.unshift(newMessage); // Add to beginning
  setMessages(messages);
  return newMessage;
}

// Get only approved messages (for patient)
export function getApprovedMessages(): Message[] {
  return getMessages().filter(m => m.status === 'approved');
}

// Get pending messages (for caretaker)
export function getPendingMessages(): Message[] {
  return getMessages().filter(m => m.status === 'pending');
}

// Approve a message
export function approveMessage(id: string): void {
  const messages = getMessages();
  const index = messages.findIndex(m => m.id === id);
  if (index !== -1) {
    messages[index].status = 'approved';
    setMessages(messages);
  }
}

// Reject/delete a message
export function rejectMessage(id: string): void {
  const messages = getMessages().filter(m => m.id !== id);
  setMessages(messages);
}

export function clearMessages(): void {
  setMessages([]);
}

// Logs
export function getLogs(): LogEntry[] {
  return getItem(KEYS.LOGS, []);
}

export function setLogs(logs: LogEntry[]): void {
  setItem(KEYS.LOGS, logs);
}

export function addLog(userText: string, lumenText: string): LogEntry {
  const logs = getLogs();
  const newLog: LogEntry = {
    id: Date.now().toString(),
    userText,
    lumenText,
    timestamp: new Date().toISOString(),
  };
  logs.unshift(newLog); // Add to beginning
  setLogs(logs);
  return newLog;
}

export function clearLogs(): void {
  setLogs([]);
}

// Profiles
export function getProfiles(): Profile[] {
  return getItem(KEYS.PROFILES, []);
}

export function setProfiles(profiles: Profile[]): void {
  setItem(KEYS.PROFILES, profiles);
}

export function updateOrCreateProfile(role: string): Profile {
  const profiles = getProfiles();
  const existingIndex = profiles.findIndex(p => p.role.toLowerCase() === role.toLowerCase());
  
  const profile: Profile = {
    id: existingIndex !== -1 ? profiles[existingIndex].id : Date.now().toString(),
    role: role.charAt(0).toUpperCase() + role.slice(1), // Capitalize
    lastSeenTimestamp: new Date().toISOString(),
  };

  if (existingIndex !== -1) {
    profiles[existingIndex] = profile;
  } else {
    profiles.push(profile);
  }
  
  setProfiles(profiles);
  return profile;
}

export function removeProfile(id: string): void {
  const profiles = getProfiles().filter(p => p.id !== id);
  setProfiles(profiles);
}

// Family session
export function setFamilySession(role: string): void {
  setItem(KEYS.FAMILY_SESSION, { role, loggedIn: true });
}

export function getFamilySession(): FamilySession | null {
  return getItem<FamilySession | null>(KEYS.FAMILY_SESSION, null);
}

export function clearFamilySession(): void {
  localStorage.removeItem(KEYS.FAMILY_SESSION);
}

// Initialize defaults if empty (call on app start)
export function initializeStorage(): void {
  // Ensure access code exists
  getAccessCode();
  
  // Ensure routines exist
  if (!localStorage.getItem(KEYS.ROUTINES)) {
    setRoutines(getRoutines());
  }
}

// Clear ALL Lumen data from localStorage (factory reset)
export function resetAllData(): void {
  Object.values(KEYS).forEach(key => {
    localStorage.removeItem(key);
  });
}

// Get all stored data for debugging
export function getAllStoredData(): Record<string, any> {
  const data: Record<string, any> = {};
  Object.entries(KEYS).forEach(([name, key]) => {
    const value = localStorage.getItem(key);
    data[name] = value ? JSON.parse(value) : null;
  });
  return data;
}
