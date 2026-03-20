const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const express = require('express');
const cors = require('cors');
const { OpenAI } = require('openai');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const rag = require('./rag');

const app = express();
const PORT = process.env.PORT || 3001;
const JWT_SECRET = process.env.JWT_SECRET || 'lumen-dev-secret-change-in-prod';
const SALT_ROUNDS = 10;

app.use(cors());
app.use(express.json({ limit: '2mb' }));

const openai = process.env.OPENAI_API_KEY
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  : null;

rag.loadStore();

let _sb = null;
function sb() {
  if (_sb !== null) return _sb;
  const url = (process.env.SUPABASE_URL || '').trim();
  const key = (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();
  if (!url || !key) { _sb = false; return false; }
  try {
    const { createClient } = require('@supabase/supabase-js');
    _sb = createClient(url, key);
    return _sb;
  } catch (e) {
    console.warn('Supabase init failed:', e.message);
    _sb = false;
    return false;
  }
}

function authMiddleware(req, res, next) {
  const header = req.get('authorization') || '';
  const token = header.replace(/^Bearer\s+/i, '');
  if (!token) return res.status(401).json({ error: 'Token required' });
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

function generateAccessCode() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

function signToken(user) {
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role, name: user.name },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
}

app.post('/api/auth/register', async (req, res) => {
  try {
    const client = sb();
    if (!client) return res.status(503).json({ error: 'Database not configured' });

    const { email, password, role, name, patientName } = req.body;
    if (!email || !password || !role) {
      return res.status(400).json({ error: 'email, password, and role are required' });
    }
    if (!['caregiver', 'family'].includes(role)) {
      return res.status(400).json({ error: 'role must be caregiver or family' });
    }
    if (password.length < 4) {
      return res.status(400).json({ error: 'Password must be at least 4 characters' });
    }

    const { data: existing } = await client
      .from('lumen_users')
      .select('id')
      .eq('email', email.toLowerCase().trim())
      .maybeSingle();
    if (existing) {
      return res.status(409).json({ error: 'Email already registered' });
    }

    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
    const { data: user, error: userErr } = await client
      .from('lumen_users')
      .insert({ email: email.toLowerCase().trim(), password_hash: passwordHash, role, name: name || '' })
      .select()
      .single();
    if (userErr) throw new Error(userErr.message);

    let patients = [];
    if (role === 'caregiver') {
      const householdId = require('crypto').randomUUID();
      const accessCode = generateAccessCode();
      const { data: p, error: pErr } = await client
        .from('lumen_patients')
        .insert({
          name: patientName || 'Patient',
          access_code: accessCode,
          household_id: householdId,
          caregiver_id: user.id,
        })
        .select()
        .single();
      if (pErr) throw new Error(pErr.message);
      patients = [p];
    }

    const token = signToken(user);
    return res.json({ token, user: { id: user.id, email: user.email, role: user.role, name: user.name }, patients });
  } catch (err) {
    console.error('register:', err.message);
    return res.status(500).json({ error: err.message });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const client = sb();
    if (!client) return res.status(503).json({ error: 'Database not configured' });

    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'email and password required' });

    const { data: user } = await client
      .from('lumen_users')
      .select('*')
      .eq('email', email.toLowerCase().trim())
      .maybeSingle();
    if (!user) return res.status(401).json({ error: 'Invalid email or password' });

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) return res.status(401).json({ error: 'Invalid email or password' });

    let patients = [];
    if (user.role === 'caregiver') {
      const { data: p } = await client
        .from('lumen_patients')
        .select('*')
        .eq('caregiver_id', user.id)
        .order('created_at', { ascending: true });
      patients = p || [];
    } else {
      const { data: links } = await client
        .from('lumen_patient_links')
        .select('*, lumen_patients(*)')
        .eq('user_id', user.id);
      patients = (links || []).map((l) => l.lumen_patients).filter(Boolean);
    }

    const token = signToken(user);
    return res.json({
      token,
      user: { id: user.id, email: user.email, role: user.role, name: user.name },
      patients,
    });
  } catch (err) {
    console.error('login:', err.message);
    return res.status(500).json({ error: err.message });
  }
});

app.post('/api/auth/validate-code', async (req, res) => {
  try {
    const client = sb();
    if (!client) return res.status(503).json({ error: 'Database not configured' });

    const { access_code } = req.body;
    if (!access_code) return res.status(400).json({ error: 'access_code required' });

    const { data: patient } = await client
      .from('lumen_patients')
      .select('id, name, household_id, access_code')
      .eq('access_code', access_code.toString().trim())
      .maybeSingle();

    if (!patient) return res.status(404).json({ error: 'Invalid access code' });

    return res.json({ patient_id: patient.id, patient_name: patient.name, household_id: patient.household_id });
  } catch (err) {
    console.error('validate-code:', err.message);
    return res.status(500).json({ error: err.message });
  }
});

app.post('/api/auth/link-patient', authMiddleware, async (req, res) => {
  try {
    const client = sb();
    if (!client) return res.status(503).json({ error: 'Database not configured' });

    const { access_code, relationship } = req.body;
    if (!access_code || !relationship) {
      return res.status(400).json({ error: 'access_code and relationship required' });
    }

    const { data: patient } = await client
      .from('lumen_patients')
      .select('id, name, household_id')
      .eq('access_code', access_code.toString().trim())
      .maybeSingle();
    if (!patient) return res.status(404).json({ error: 'Invalid access code' });

    const { data: existingLink } = await client
      .from('lumen_patient_links')
      .select('id')
      .eq('patient_id', patient.id)
      .eq('user_id', req.user.id)
      .maybeSingle();

    if (!existingLink) {
      const { error: linkErr } = await client
        .from('lumen_patient_links')
        .insert({ patient_id: patient.id, user_id: req.user.id, relationship });
      if (linkErr) throw new Error(linkErr.message);
    }

    return res.json({ patient });
  } catch (err) {
    console.error('link-patient:', err.message);
    return res.status(500).json({ error: err.message });
  }
});

app.get('/api/auth/me', authMiddleware, async (req, res) => {
  try {
    const client = sb();
    if (!client) return res.status(503).json({ error: 'Database not configured' });

    let patients = [];
    if (req.user.role === 'caregiver') {
      const { data: p } = await client.from('lumen_patients').select('*').eq('caregiver_id', req.user.id).order('created_at', { ascending: true });
      patients = p || [];
    } else {
      const { data: links } = await client
        .from('lumen_patient_links')
        .select('*, lumen_patients(*)')
        .eq('user_id', req.user.id);
      patients = (links || []).map((l) => l.lumen_patients).filter(Boolean);
    }

    return res.json({ user: req.user, patients });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

app.post('/api/patients', authMiddleware, async (req, res) => {
  try {
    const client = sb();
    if (!client) return res.status(503).json({ error: 'Database not configured' });
    if (req.user.role !== 'caregiver') return res.status(403).json({ error: 'Only caregivers can add patients' });

    const { name } = req.body;
    if (!name || !name.trim()) return res.status(400).json({ error: 'Patient name is required' });

    const householdId = require('crypto').randomUUID();
    const accessCode = generateAccessCode();
    const { data: patient, error: pErr } = await client
      .from('lumen_patients')
      .insert({ name: name.trim(), access_code: accessCode, household_id: householdId, caregiver_id: req.user.id })
      .select()
      .single();
    if (pErr) throw new Error(pErr.message);

    return res.json(patient);
  } catch (err) {
    console.error('POST /api/patients:', err.message);
    return res.status(500).json({ error: err.message });
  }
});

app.get('/api/patients', authMiddleware, async (req, res) => {
  try {
    const client = sb();
    if (!client) return res.status(503).json({ error: 'Database not configured' });

    let patients = [];
    if (req.user.role === 'caregiver') {
      const { data } = await client.from('lumen_patients').select('*').eq('caregiver_id', req.user.id).order('created_at', { ascending: true });
      patients = data || [];
    } else {
      const { data: links } = await client.from('lumen_patient_links').select('*, lumen_patients(*)').eq('user_id', req.user.id);
      patients = (links || []).map((l) => l.lumen_patients).filter(Boolean);
    }

    return res.json(patients);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

app.post('/api/messages', authMiddleware, async (req, res) => {
  try {
    const client = sb();
    if (!client) return res.status(503).json({ error: 'Database not configured' });

    const { patient_id, text, sender_name, sender_role, delivery_type, scheduled_at, location, estimated_return } = req.body;
    if (!patient_id || !text) return res.status(400).json({ error: 'patient_id and text required' });

    const row = {
      patient_id,
      sender_id: req.user.id,
      sender_name: sender_name || req.user.name || 'Unknown',
      sender_role: sender_role || req.user.role,
      text,
      status: req.user.role === 'caregiver' ? 'approved' : 'pending',
      delivery_type: delivery_type || 'immediate',
      scheduled_at: scheduled_at || null,
      location: location || null,
      estimated_return: estimated_return || null,
    };

    const { data: msg, error } = await client.from('lumen_messages').insert(row).select().single();
    if (error) throw new Error(error.message);

    return res.json(msg);
  } catch (err) {
    console.error('POST /api/messages:', err.message);
    return res.status(500).json({ error: err.message });
  }
});

app.get('/api/messages', authMiddleware, async (req, res) => {
  try {
    const client = sb();
    if (!client) return res.status(503).json({ error: 'Database not configured' });

    const patientId = req.query.patient_id;
    if (!patientId) return res.status(400).json({ error: 'patient_id required' });

    const { data, error } = await client
      .from('lumen_messages')
      .select('*')
      .eq('patient_id', patientId)
      .order('created_at', { ascending: false });
    if (error) throw new Error(error.message);

    return res.json(data || []);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

app.patch('/api/messages/:id', authMiddleware, async (req, res) => {
  try {
    const client = sb();
    if (!client) return res.status(503).json({ error: 'Database not configured' });

    const { status } = req.body;
    if (!status || !['approved', 'rejected'].includes(status)) {
      return res.status(400).json({ error: 'status must be approved or rejected' });
    }

    const { data, error } = await client
      .from('lumen_messages')
      .update({ status })
      .eq('id', req.params.id)
      .select()
      .single();
    if (error) throw new Error(error.message);

    return res.json(data);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

app.delete('/api/messages/:id', authMiddleware, async (req, res) => {
  try {
    const client = sb();
    if (!client) return res.status(503).json({ error: 'Database not configured' });

    const { error } = await client.from('lumen_messages').delete().eq('id', req.params.id);
    if (error) throw new Error(error.message);

    return res.json({ ok: true });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

app.post('/api/routines', authMiddleware, async (req, res) => {
  try {
    const client = sb();
    if (!client) return res.status(503).json({ error: 'Database not configured' });

    const { patient_id, time, label, recurring, days_of_week } = req.body;
    if (!patient_id || !time || !label) return res.status(400).json({ error: 'patient_id, time, and label required' });

    const { data, error } = await client
      .from('lumen_routines')
      .insert({ patient_id, time, label, recurring: recurring !== false, days_of_week: days_of_week || null })
      .select()
      .single();
    if (error) throw new Error(error.message);

    return res.json(data);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

app.get('/api/routines', authMiddleware, async (req, res) => {
  try {
    const client = sb();
    if (!client) return res.status(503).json({ error: 'Database not configured' });

    const patientId = req.query.patient_id;
    if (!patientId) return res.status(400).json({ error: 'patient_id required' });

    const { data, error } = await client
      .from('lumen_routines')
      .select('*')
      .eq('patient_id', patientId)
      .order('time', { ascending: true });
    if (error) throw new Error(error.message);

    return res.json(data || []);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

app.put('/api/routines/:id', authMiddleware, async (req, res) => {
  try {
    const client = sb();
    if (!client) return res.status(503).json({ error: 'Database not configured' });

    const { time, label, recurring, days_of_week } = req.body;
    const updates = {};
    if (time !== undefined) updates.time = time;
    if (label !== undefined) updates.label = label;
    if (recurring !== undefined) updates.recurring = recurring;
    if (days_of_week !== undefined) updates.days_of_week = days_of_week;

    const { data, error } = await client
      .from('lumen_routines')
      .update(updates)
      .eq('id', req.params.id)
      .select()
      .single();
    if (error) throw new Error(error.message);

    return res.json(data);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

app.delete('/api/routines/:id', authMiddleware, async (req, res) => {
  try {
    const client = sb();
    if (!client) return res.status(503).json({ error: 'Database not configured' });

    const { error } = await client.from('lumen_routines').delete().eq('id', req.params.id);
    if (error) throw new Error(error.message);

    return res.json({ ok: true });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

function filterUpcomingRoutines(routines) {
  const now = new Date();
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  return routines.filter((r) => {
    const parts = r.time.match(/^(\d{1,2}):(\d{2})$/);
    if (!parts) return true;
    const routineMinutes = parseInt(parts[1], 10) * 60 + parseInt(parts[2], 10);
    return routineMinutes >= nowMinutes;
  });
}

function formatTime12h(date) {
  return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
}

function extractAgentBody(req) {
  const b = req.body || {};
  const query =
    b.query || b.user_message || b.userMessage || b.message || b.text ||
    (typeof b.input === 'string' ? b.input : '') || '';
  const householdId = (b.household_id || b.householdId || b.care_id || 'default').toString().trim() || 'default';
  const patientName = (b.patient_name || b.patientName || 'the patient').toString();
  return { query: String(query).trim(), householdId, patientName };
}

async function fetchPatientDataByHousehold(householdId) {
  const client = sb();
  if (!client) return { messages: [], routines: [], patientName: null };

  try {
    const { data: patient } = await client
      .from('lumen_patients')
      .select('id, name')
      .eq('household_id', householdId)
      .maybeSingle();

    if (!patient) return { messages: [], routines: [], patientName: null };

    const now = new Date().toISOString();

    const { data: messages } = await client
      .from('lumen_messages')
      .select('*')
      .eq('patient_id', patient.id)
      .eq('status', 'approved')
      .or(`delivery_type.eq.immediate,and(delivery_type.eq.scheduled,scheduled_at.lte.${now})`)
      .is('delivered_at', null)
      .order('created_at', { ascending: false })
      .limit(20);

    const { data: routines } = await client
      .from('lumen_routines')
      .select('*')
      .eq('patient_id', patient.id)
      .order('time', { ascending: true });

    return {
      messages: messages || [],
      routines: routines || [],
      patientName: patient.name,
      patientId: patient.id,
    };
  } catch (e) {
    console.warn('fetchPatientDataByHousehold:', e.message);
    return { messages: [], routines: [], patientName: null };
  }
}

app.post('/api/agent/context', async (req, res) => {
  try {
    const secret = process.env.LUMEN_AGENT_WEBHOOK_SECRET;
    if (secret) {
      const sent = req.get('x-lumen-secret') || (req.get('authorization') || '').replace(/^Bearer\s+/i, '');
      if (sent !== secret) return res.status(401).json({ error: 'Unauthorized' });
    }

    if (!openai) {
      return res.status(503).json({
        error: 'Embeddings unavailable',
        context_for_agent: 'Care knowledge base is offline. Say gently that you cannot look that up right now.',
        snippets: [],
      });
    }

    const { query, householdId, patientName: reqPatientName } = extractAgentBody(req);
    if (!query) return res.status(400).json({ error: 'query or user_message required' });

    let snippets = [];
    try {
      snippets = await rag.retrieve(openai, query, householdId);
    } catch (e) {
      console.warn('agent/context RAG:', e.message);
    }

    const dbData = await fetchPatientDataByHousehold(householdId);
    const patientName = dbData.patientName || reqPatientName;

    const currentTime = formatTime12h(new Date());
    const upcomingRoutines = filterUpcomingRoutines(dbData.routines);

    let scheduleLine = '';
    if (upcomingRoutines.length) {
      scheduleLine = `Current time: ${currentTime}. Remaining schedule today: ${upcomingRoutines.map((r) => `${r.time} - ${r.label}`).join('; ')}. `;
    } else if (dbData.routines.length) {
      scheduleLine = `Current time: ${currentTime}. All scheduled activities for today are done. `;
    } else {
      scheduleLine = `Current time: ${currentTime}. `;
    }

    let msgLine = '';
    if (dbData.messages.length) {
      msgLine = `New messages for patient: ${dbData.messages.map((m) => `From ${m.sender_name} (${m.sender_role}): "${m.text}"`).join(' | ')}. `;

      const client = sb();
      if (client && dbData.messages.length) {
        try {
          const ids = dbData.messages.map((m) => m.id);
          for (const mid of ids) {
            await client.from('lumen_messages').update({ delivered_at: new Date().toISOString() }).eq('id', mid);
          }
        } catch (_) {}
      }
    }

    const docBlock = snippets.length > 0
      ? `From care documents:\n${snippets.map((s, i) => `[${i + 1}] ${s}`).join('\n')}`
      : 'No matching care document excerpts.';

    const context_for_agent = `Patient: ${patientName}. ${scheduleLine}${msgLine}${docBlock}

RULES: Answer only using the above. If the answer is not there, say you do not have that information and they can ask their caregiver. Short, calm sentences. MEDICAL SAFETY: Never give general medical advice, diagnoses, or health recommendations from your own knowledge. If the patient asks a medical question and the answer is explicitly provided in the care documents above (placed there by the caregiver), you may share that specific information. If the medical information is NOT in the care documents, you must say they should speak with their caregiver or doctor. Never speculate or add medical details beyond what the caregiver provided. CRITICAL: Never output emotion labels, stage directions, asterisks, or annotations like *happy*, *confused*, *concerned*, (softly), [pause], etc. Your text is spoken aloud by TTS — every word you write will be read verbatim. Just speak naturally and warmly without any markup or annotations.`;

    return res.json({ snippets, context_for_agent, patient_name: patientName });
  } catch (err) {
    console.error('POST /api/agent/context', err.message);
    return res.status(500).json({ error: err.message });
  }
});

function buildSystemPrompt(context, retrievedChunks = []) {
  const { patientName, routines, messages } = context;
  let prompt = `You are Lumen, a calm, reassuring voice companion for ${patientName}, who may have memory or cognitive challenges. You are warm, patient, and speak in short, clear sentences (1-3 at a time). Never mention that you are an AI. You are here to help with schedule, messages from family, and general comfort. MEDICAL SAFETY: Never give general medical advice, diagnoses, or health recommendations from your own knowledge. If the patient asks a medical question and the answer is explicitly provided in the care documents above (placed there by the caregiver), you may share that specific information. If the medical information is NOT in the care documents, you must say they should speak with their caregiver or doctor. Never speculate or add medical details beyond what the caregiver provided.

Current context you must use when relevant:
- Patient's name: ${patientName}
- Today's schedule/routines: ${routines.length ? routines.map((r) => `${r.time} - ${r.label}`).join('; ') : 'No routines scheduled.'}
- Approved messages from family: ${messages.length ? messages.map((m) => `From ${m.fromName} (${m.fromRole}): "${m.text}"`).join('; ') : 'No messages.'}`;

  if (retrievedChunks.length > 0) {
    prompt += `\n\nRelevant information from care documents (only use facts present here):\n${retrievedChunks.map((c) => `- ${c}`).join('\n')}`;
  }
  prompt += `\n\nRules: Keep replies brief and suitable for speech. If something is not in the context above, say you don't have that information and suggest they ask their caregiver. If the user is anxious or confused, reassure them they are safe at home. If the patient asks about medications or medical topics and the answer is in the care documents, share only that specific caregiver-provided information. Otherwise, redirect to their caregiver or doctor.`;
  return prompt;
}

app.post('/api/chat', async (req, res) => {
  try {
    const { userMessage, context } = req.body;
    if (!userMessage || typeof userMessage !== 'string') return res.status(400).json({ error: 'userMessage is required' });
    if (!openai) return res.status(503).json({ error: 'LLM not configured', message: 'Add OPENAI_API_KEY to the .env file and restart the server.' });

    const ctx = context || { patientName: 'the user', routines: [], messages: [] };
    const householdId = (ctx.householdId || ctx.household_id || 'default').toString().trim() || 'default';
    let retrievedChunks = [];
    try { retrievedChunks = await rag.retrieve(openai, userMessage.trim(), householdId); } catch (e) { console.warn('RAG retrieve failed:', e.message); }
    const systemPrompt = buildSystemPrompt(ctx, retrievedChunks);

    const completion = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
      messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: userMessage.trim() }],
      max_tokens: 180,
      temperature: 0.65,
    });
    const reply = completion.choices[0]?.message?.content?.trim() || "I'm here with you. Could you say that again?";
    return res.json({ reply });
  } catch (err) {
    console.error('POST /api/chat error:', err.message);
    if (err.status === 401) return res.status(401).json({ error: 'Invalid API key', message: 'Check OPENAI_API_KEY in .env' });
    if (err.status === 429) return res.status(429).json({ error: 'Rate limited', message: 'Please try again in a moment.' });
    return res.status(500).json({ error: 'LLM error', message: err.message || 'Something went wrong.' });
  }
});

app.post('/api/tts', async (req, res) => {
  const key = process.env.ELEVENLABS_API_KEY;
  const voiceId = process.env.ELEVENLABS_VOICE_ID || '21m00Tcm4TlvDq8ikWAM';
  if (!key) return res.status(503).json({ error: 'TTS not configured' });
  const text = (req.body?.text || '').toString().trim();
  if (!text || text.length > 2500) return res.status(400).json({ error: 'text required (max 2500 chars)' });
  try {
    const url = `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`;
    const r = await fetch(url, {
      method: 'POST',
      headers: { 'xi-api-key': key, 'Content-Type': 'application/json', Accept: 'audio/mpeg' },
      body: JSON.stringify({ text, model_id: process.env.ELEVENLABS_TTS_MODEL || 'eleven_turbo_v2_5' }),
    });
    if (!r.ok) { const errText = await r.text(); console.warn('ElevenLabs TTS:', r.status, errText.slice(0, 200)); return res.status(502).json({ error: 'TTS upstream error' }); }
    const buf = Buffer.from(await r.arrayBuffer());
    res.setHeader('Content-Type', 'audio/mpeg');
    res.send(buf);
  } catch (e) { console.error('TTS', e.message); return res.status(500).json({ error: 'TTS failed' }); }
});

app.get('/api/health', async (req, res) => {
  const householdId = (req.query.household_id || 'default').toString();
  let ragInfo = { chunks: 0, backend: 'file' };
  try { ragInfo = await rag.chunkStats(householdId); } catch (e) { ragInfo = { chunks: rag.getStore().countForHousehold(householdId), backend: rag.useSupabase() ? 'supabase' : 'file' }; }
  res.json({ ok: true, llm: !!openai, rag: ragInfo, ragTotalFile: rag.getStore().totalCount(), supabase: rag.useSupabase(), tts: !!process.env.ELEVENLABS_API_KEY, agentWebhook: true, message: openai ? 'Ready' : 'Add OPENAI_API_KEY to .env' });
});

app.post('/api/documents', async (req, res) => {
  try {
    if (!openai) return res.status(503).json({ error: 'LLM not configured', message: 'Set OPENAI_API_KEY to use RAG.' });
    const { text, docId, household_id, householdId } = req.body;
    if (!text || typeof text !== 'string') return res.status(400).json({ error: 'text is required' });
    const hid = (household_id || householdId || 'default').toString().trim() || 'default';
    const result = await rag.indexText(openai, text, docId, hid);
    return res.json({ ok: true, chunks: result.chunks, household_id: hid });
  } catch (err) { console.error('POST /api/documents error:', err.message); return res.status(500).json({ error: 'RAG index failed', message: err.message }); }
});

app.get('/api/rag/status', async (req, res) => {
  const householdId = (req.query.household_id || 'default').toString();
  try { const stats = await rag.chunkStats(householdId); return res.json({ ...stats, household_id: householdId }); }
  catch (e) { return res.json({ chunks: rag.getStore().countForHousehold(householdId), backend: 'file', household_id: householdId }); }
});

app.get('/api/elevenlabs/token', async (req, res) => {
  const key = process.env.ELEVENLABS_API_KEY;
  const agentId = (req.query.agent_id || process.env.ELEVENLABS_AGENT_ID || '').toString().trim();
  if (!key) return res.status(503).json({ error: 'ELEVENLABS_API_KEY missing' });
  if (!agentId) return res.status(400).json({ error: 'agent_id query required' });
  try {
    const url = `https://api.elevenlabs.io/v1/convai/conversation/get-signed-url?agent_id=${encodeURIComponent(agentId)}`;
    const r = await fetch(url, { headers: { 'xi-api-key': key } });
    const body = await r.json().catch(() => ({}));
    if (!r.ok) return res.status(r.status).json({ error: body.detail || body.message || 'ElevenLabs signed-url request failed' });
    if (!body.signed_url) return res.status(502).json({ error: 'No signed_url in ElevenLabs response' });
    return res.json({ signed_url: body.signed_url });
  } catch (e) { console.error('elevenlabs/token', e.message); return res.status(500).json({ error: e.message || 'token failed' }); }
});

app.listen(PORT, () => {
  console.log(`Lumen API at http://localhost:${PORT}`);
  console.log(openai ? 'OpenAI: enabled' : 'OpenAI: disabled');
  console.log(rag.useSupabase() ? 'RAG store: Supabase' : 'RAG store: local file');
  console.log(sb() ? 'Auth DB: Supabase' : 'Auth DB: not configured');
  console.log(process.env.ELEVENLABS_API_KEY ? 'ElevenLabs TTS: enabled' : 'ElevenLabs TTS: optional');
});
