const API_BASE = '/api';

const KEYS = {
  AUTH_TOKEN: 'lumen_auth_token',
  AUTH_USER: 'lumen_auth_user',
  AUTH_PATIENTS: 'lumen_auth_patients',
  ACTIVE_PATIENT_ID: 'lumen_active_patient_id',
  HOUSEHOLD_ID: 'lumen_household_id',
  PATIENT_HOUSEHOLD_OVERRIDE: 'lumen_patient_household_id',
  FAMILY_SESSION: 'lumen_family_session',
};

export interface User {
  id: string;
  email: string;
  role: 'caregiver' | 'family';
  name: string;
}

export interface Patient {
  id: string;
  name: string;
  access_code: string;
  household_id: string;
  caregiver_id: string;
}

export interface Routine {
  id: string;
  time: string;
  label: string;
  patient_id?: string;
  recurring?: boolean;
  days_of_week?: string[] | null;
}

export interface Message {
  id: string;
  patient_id?: string;
  sender_id?: string;
  sender_name: string;
  sender_role: string;
  text: string;
  status: 'pending' | 'approved' | 'rejected';
  delivery_type: 'immediate' | 'scheduled';
  scheduled_at?: string | null;
  delivered_at?: string | null;
  location?: string;
  estimated_return?: string;
  created_at?: string;
}

export interface FamilySession {
  role: string;
  loggedIn: boolean;
}

function getJson<T>(key: string, fallback: T): T {
  try {
    const v = localStorage.getItem(key);
    return v ? JSON.parse(v) : fallback;
  } catch { return fallback; }
}

function setJson<T>(key: string, value: T): void {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch {}
}

async function safeJson(res: Response): Promise<any> {
  const text = await res.text();
  try { return JSON.parse(text); } catch {
    throw new Error(res.ok ? 'Invalid server response' : `Server error (${res.status}). Is the backend running?`);
  }
}

async function apiFetch(path: string, opts: RequestInit = {}): Promise<Response> {
  const token = getAuthToken();
  const headers: Record<string, string> = { 'Content-Type': 'application/json', ...(opts.headers as Record<string, string> || {}) };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  return fetch(`${API_BASE}${path}`, { ...opts, headers });
}

export function getAuthToken(): string | null {
  return localStorage.getItem(KEYS.AUTH_TOKEN);
}

export function getAuthUser(): User | null {
  return getJson<User | null>(KEYS.AUTH_USER, null);
}

export function getAuthPatients(): Patient[] {
  return getJson<Patient[]>(KEYS.AUTH_PATIENTS, []);
}

export function getActivePatientId(): string | null {
  return localStorage.getItem(KEYS.ACTIVE_PATIENT_ID);
}

export function setActivePatientId(id: string): void {
  localStorage.setItem(KEYS.ACTIVE_PATIENT_ID, id);
  const patient = getAuthPatients().find((p) => p.id === id);
  if (patient) localStorage.setItem(KEYS.HOUSEHOLD_ID, patient.household_id);
}

export function getAuthPatient(): Patient | null {
  const patients = getAuthPatients();
  if (patients.length === 0) return null;
  const activeId = getActivePatientId();
  if (activeId) {
    const found = patients.find((p) => p.id === activeId);
    if (found) return found;
  }
  return patients[0];
}

export function setAuthSession(token: string, user: User, patients: Patient[]): void {
  localStorage.setItem(KEYS.AUTH_TOKEN, token);
  setJson(KEYS.AUTH_USER, user);
  setJson(KEYS.AUTH_PATIENTS, patients);
  if (patients.length > 0) {
    const activeId = getActivePatientId();
    const stillValid = activeId && patients.some((p) => p.id === activeId);
    if (!stillValid) {
      localStorage.setItem(KEYS.ACTIVE_PATIENT_ID, patients[0].id);
      localStorage.setItem(KEYS.HOUSEHOLD_ID, patients[0].household_id);
    }
  }
}

export function addPatientToSession(patient: Patient): void {
  const patients = getAuthPatients();
  patients.push(patient);
  setJson(KEYS.AUTH_PATIENTS, patients);
  setActivePatientId(patient.id);
}

export function clearAuthSession(): void {
  localStorage.removeItem(KEYS.AUTH_TOKEN);
  localStorage.removeItem(KEYS.AUTH_USER);
  localStorage.removeItem(KEYS.AUTH_PATIENTS);
  localStorage.removeItem(KEYS.ACTIVE_PATIENT_ID);
}

export function isLoggedIn(): boolean {
  return !!getAuthToken();
}

export function isCaretakerLoggedIn(): boolean {
  const user = getAuthUser();
  return !!getAuthToken() && user?.role === 'caregiver';
}

export function isFamilyLoggedIn(): boolean {
  const user = getAuthUser();
  return !!getAuthToken() && user?.role === 'family';
}

export async function apiRegister(email: string, password: string, role: 'caregiver' | 'family', name: string, patientName?: string): Promise<{ token: string; user: User; patients: Patient[] }> {
  let res: Response;
  try {
    res = await fetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, role, name, patientName }),
    });
  } catch { throw new Error('Cannot reach server. Make sure the backend is running (npm run dev:all).'); }
  const data = await safeJson(res);
  if (!res.ok) throw new Error(data.error || 'Registration failed');
  const patients = data.patients || (data.patient ? [data.patient] : []);
  setAuthSession(data.token, data.user, patients);
  return { token: data.token, user: data.user, patients };
}

export async function apiLogin(email: string, password: string): Promise<{ token: string; user: User; patients: Patient[] }> {
  let res: Response;
  try {
    res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
  } catch { throw new Error('Cannot reach server. Make sure the backend is running (npm run dev:all).'); }
  const data = await safeJson(res);
  if (!res.ok) throw new Error(data.error || 'Login failed');
  const patients = data.patients || (data.patient ? [data.patient] : []);
  setAuthSession(data.token, data.user, patients);
  return { token: data.token, user: data.user, patients };
}

export async function apiValidateCode(accessCode: string): Promise<{ patient_id: string; patient_name: string; household_id: string }> {
  let res: Response;
  try {
    res = await fetch(`${API_BASE}/auth/validate-code`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ access_code: accessCode }),
    });
  } catch { throw new Error('Cannot reach server. Make sure the backend is running.'); }
  const data = await safeJson(res);
  if (!res.ok) throw new Error(data.error || 'Invalid code');
  return data;
}

export async function apiLinkPatient(accessCode: string, relationship: string): Promise<{ patient: Patient }> {
  const res = await apiFetch('/auth/link-patient', {
    method: 'POST',
    body: JSON.stringify({ access_code: accessCode, relationship }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Link failed');
  if (data.patient) {
    addPatientToSession(data.patient);
  }
  return data;
}

export async function apiCreatePatient(name: string): Promise<Patient> {
  const res = await apiFetch('/patients', { method: 'POST', body: JSON.stringify({ name }) });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to create patient');
  addPatientToSession(data);
  return data;
}

export async function apiGetPatients(): Promise<Patient[]> {
  const res = await apiFetch('/patients');
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to fetch patients');
  return data;
}

export async function apiGetMessages(patientId: string): Promise<Message[]> {
  const res = await apiFetch(`/messages?patient_id=${patientId}`);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to fetch messages');
  return data;
}

export async function apiCreateMessage(msg: {
  patient_id: string;
  text: string;
  sender_name: string;
  sender_role: string;
  delivery_type?: 'immediate' | 'scheduled';
  scheduled_at?: string | null;
  location?: string;
  estimated_return?: string;
}): Promise<Message> {
  const res = await apiFetch('/messages', { method: 'POST', body: JSON.stringify(msg) });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to create message');
  return data;
}

export async function apiUpdateMessageStatus(id: string, status: 'approved' | 'rejected'): Promise<Message> {
  const res = await apiFetch(`/messages/${id}`, { method: 'PATCH', body: JSON.stringify({ status }) });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to update message');
  return data;
}

export async function apiDeleteMessage(id: string): Promise<void> {
  const res = await apiFetch(`/messages/${id}`, { method: 'DELETE' });
  if (!res.ok) { const d = await res.json(); throw new Error(d.error || 'Failed to delete message'); }
}

export async function apiGetRoutines(patientId: string): Promise<Routine[]> {
  const res = await apiFetch(`/routines?patient_id=${patientId}`);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to fetch routines');
  return data;
}

export async function apiCreateRoutine(r: { patient_id: string; time: string; label: string; recurring?: boolean }): Promise<Routine> {
  const res = await apiFetch('/routines', { method: 'POST', body: JSON.stringify(r) });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to create routine');
  return data;
}

export async function apiUpdateRoutine(id: string, updates: Partial<Routine>): Promise<Routine> {
  const res = await apiFetch(`/routines/${id}`, { method: 'PUT', body: JSON.stringify(updates) });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to update routine');
  return data;
}

export async function apiDeleteRoutine(id: string): Promise<void> {
  const res = await apiFetch(`/routines/${id}`, { method: 'DELETE' });
  if (!res.ok) { const d = await res.json(); throw new Error(d.error || 'Failed to delete routine'); }
}

export function getOrCreateHouseholdId(): string {
  let id = localStorage.getItem(KEYS.HOUSEHOLD_ID);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(KEYS.HOUSEHOLD_ID, id);
  }
  return id;
}

export function setPatientHouseholdOverride(id: string): void {
  localStorage.setItem(KEYS.PATIENT_HOUSEHOLD_OVERRIDE, id.trim());
}

export function getPatientHouseholdOverride(): string | null {
  return localStorage.getItem(KEYS.PATIENT_HOUSEHOLD_OVERRIDE);
}

export function getHouseholdIdForApi(): string {
  const override = getPatientHouseholdOverride();
  if (override) return override;
  const patient = getAuthPatient();
  if (patient?.household_id) return patient.household_id;
  return getOrCreateHouseholdId();
}

export function getPatientName(): string {
  const patient = getAuthPatient();
  if (patient?.name) return patient.name;
  return 'Patient';
}

export function setFamilySession(role: string): void {
  setJson(KEYS.FAMILY_SESSION, { role, loggedIn: true });
}

export function getFamilySession(): FamilySession | null {
  return getJson<FamilySession | null>(KEYS.FAMILY_SESSION, null);
}

export function clearFamilySession(): void {
  localStorage.removeItem(KEYS.FAMILY_SESSION);
}

export function initializeStorage(): void {
  getOrCreateHouseholdId();
}

export function resetAllData(): void {
  Object.values(KEYS).forEach((key) => localStorage.removeItem(key));
}
