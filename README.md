# Lumen AI — Voice Companion for Eldercare

Lumen is a voice-first AI companion built for elderly individuals with memory or cognitive challenges. Caregivers upload care notes, set daily routines, and manage family messages through a dashboard. The patient simply talks to Lumen using their voice — no screens or typing required. Lumen retrieves answers exclusively from caregiver-provided documents using a RAG (Retrieval-Augmented Generation) pipeline and never fabricates medical advice.

---

## Architecture

```
┌──────────────────────────────┐
│         Frontend (React)     │  localhost:3000
│  Landing · Patient Voice     │
│  Caregiver Dashboard         │
│  Family & Friends Portal     │
└──────────┬───────────────────┘
           │ /api/* (Vite proxy)
┌──────────▼───────────────────┐
│     Backend (Express API)    │  localhost:3001
│  Auth · Messages · Routines  │
│  RAG index & retrieve        │
│  ElevenLabs signed-URL proxy │
│  Agent webhook endpoint      │
└──────────┬───────────────────┘
           │
    ┌──────▼──────┐   ┌──────────────────┐   ┌──────────────────┐
    │  Supabase   │   │     OpenAI       │   │   ElevenLabs     │
    │  PostgreSQL │   │  Embeddings +    │   │  Conversational  │
    │  + pgvector │   │  Chat (gpt-4o-   │   │  AI Agent (STT   │
    │  (database  │   │  mini)           │   │  + LLM + TTS)    │
    │  + vectors) │   └──────────────────┘   └──────────────────┘
    └─────────────┘
```

**How the voice pipeline works end-to-end:**

1. The patient taps "Talk to Lumen" and enters a 6-digit access code provided by their caregiver.
2. The frontend requests a **signed WebSocket URL** from the backend (`GET /api/elevenlabs/token`), which proxies the ElevenLabs API so the API key never reaches the browser.
3. The `@elevenlabs/react` SDK opens a WebRTC session to the ElevenLabs Conversational AI agent using that signed URL.
4. When the patient speaks, ElevenLabs transcribes the speech, then calls a **server tool (webhook)** configured in the ElevenLabs agent dashboard. This webhook points to `POST /api/agent/context` on the backend (exposed via ngrok during development).
5. The backend receives the patient's query and their `household_id`, uses OpenAI embeddings to perform a **cosine similarity search** against the household's vectors in Supabase pgvector, and returns the top-5 matching care document excerpts along with upcoming routines, pending messages, and the current time.
6. The ElevenLabs agent's built-in LLM reads these excerpts and generates a personalized, grounded response spoken aloud via TTS.

---

## Project Structure

```
Lumenvoiceaiinterfacedesign/
├── .env.example              # Template for environment variables
├── .gitignore
├── package.json              # Root — runs both frontend + backend
├── README.md
│
├── frontend/                 # React 18 + Vite 6 + Tailwind CSS v4
│   ├── index.html
│   ├── package.json
│   ├── tsconfig.json
│   ├── vite.config.ts
│   └── src/
│       ├── main.tsx
│       ├── App.tsx
│       ├── index.css
│       ├── styles/globals.css
│       ├── vite-env.d.ts
│       ├── lib/
│       │   └── storage.ts    # API client + localStorage helpers
│       └── components/
│           ├── LandingPage.tsx
│           ├── CaretakerAuth.tsx
│           ├── CaretakerDashboard.tsx
│           ├── PatientElevenLabs.tsx
│           ├── FamilyAccessEntry.tsx
│           └── FamilyMessage.tsx
│
└── backend/                  # Node.js + Express
    ├── index.js              # API server (auth, CRUD, RAG, webhooks)
    ├── rag.js                # RAG pipeline (chunk, embed, retrieve)
    ├── package.json
    ├── supabase-auth.sql     # Schema for users, patients, messages, routines
    ├── supabase-rag.sql      # Schema for pgvector + match function
    └── data/                 # Local fallback RAG store (JSON)
```

---

## Prerequisites

- **Node.js** 18+ and npm
- **ngrok** (free account) — to expose the backend webhook to ElevenLabs during development
- Accounts and API keys for:
  - [OpenAI](https://platform.openai.com/) — embeddings + chat completions
  - [ElevenLabs](https://elevenlabs.io/) — conversational AI agent
  - [Supabase](https://supabase.com/) — PostgreSQL database with pgvector

---

## Setup

### 1. Clone the repository

```bash
git clone <repo-url>
cd Lumenvoiceaiinterfacedesign
```

### 2. Create your `.env` file

```bash
cp .env.example .env
```

Open `.env` and fill in your API keys:

| Variable | Where to get it |
|---|---|
| `OPENAI_API_KEY` | [OpenAI API keys](https://platform.openai.com/api-keys) |
| `ELEVENLABS_API_KEY` | [ElevenLabs API keys](https://elevenlabs.io/app/settings/api-keys) |
| `ELEVENLABS_VOICE_ID` | Any voice ID from ElevenLabs Voice Library |
| `VITE_ELEVENLABS_AGENT_ID` | Create an agent at [ElevenLabs Agents](https://elevenlabs.io/app/conversational-ai) and copy its ID |
| `VITE_ELEVENLABS_USE_CONV_TOKEN` | Set to `true` for private agents (recommended) |
| `SUPABASE_URL` | Your Supabase project URL (Settings → API) |
| `SUPABASE_SERVICE_ROLE_KEY` | Your Supabase service role key (Settings → API) |

### 3. Set up the Supabase database

In your Supabase project, go to the **SQL Editor** and run these two scripts in order:

1. **`backend/supabase-rag.sql`** — creates the `rag_chunks` table with pgvector and the `match_rag_chunks` function.
2. **`backend/supabase-auth.sql`** — creates the `lumen_users`, `lumen_patients`, `lumen_patient_links`, `lumen_messages`, and `lumen_routines` tables.

### 4. Install dependencies

```bash
npm run install:all
```

This installs dependencies for both `frontend/` and `backend/`.

### 5. Configure the ElevenLabs Agent Webhook

1. Start ngrok to tunnel your local backend:
   ```bash
   ngrok http 3001
   ```
2. Copy the HTTPS forwarding URL (e.g. `https://abc123.ngrok-free.dev`).
3. In the [ElevenLabs Agent Dashboard](https://elevenlabs.io/app/conversational-ai), open your agent and add a **Server Tool**:
   - **Name:** `get_care_context`
   - **Description:** `Look up patient care context and memory when the patient asks a question or needs help. Always call this tool when the patient says something.`
   - **Method:** `POST`
   - **URL:** `<your-ngrok-url>/api/agent/context`
   - **Header:** `Content-Type` = `application/json` (type: Value)
   - **Body parameters:**
     - `query` (string, Required, Value Type: LLM Prompt, Description: `The patient's question or statement`)
     - `household_id` (string, Required, Value Type: Dynamic Variable, Variable Name: `household_id`)
     - `patient_name` (string, Required, Value Type: Dynamic Variable, Variable Name: `patient_name`)
   - **Dynamic Variables:** Add `household_id` and `patient_name` with test placeholder values.
   - **Execution mode:** Immediate

### 6. Start the application

```bash
npm run dev
```

This starts both the frontend (port 3000) and backend (port 3001) concurrently.

Open **http://localhost:3000** in your browser.

---

## User Roles

### Patient (Voice-Only)
- Tap "Talk to Lumen" on the landing page.
- Enter the 6-digit access code provided by the caregiver.
- Speak naturally. Lumen responds with information from the caregiver's care documents, upcoming routines, and family messages.

### Caregiver (Dashboard)
- Sign up or log in via "Caregiver Dashboard".
- On signup, a patient profile is created automatically with a unique 6-digit access code.
- **Care Memory tab:** Paste care notes (medications, preferences, family details, routines in prose). Click "Save & index for Lumen" to chunk, embed, and store in the vector database.
- **Routines tab:** Add daily scheduled routines with time and label. Lumen uses these for time-aware reminders.
- **Messages tab:** Review and approve/reject messages from family and friends before Lumen reads them to the patient.
- **Settings tab:** View all managed patients. Add additional patients (multi-patient support for nursing homes or multiple family members).

### Family & Friends (Message Portal)
- Sign up or log in, then link to a patient using the 6-digit access code.
- Send messages (immediate or scheduled) that go through caregiver approval.
- View the patient's daily schedule and message history.

---

## Key Features

- **RAG Pipeline:** Care notes are chunked (400 chars, 50-char overlap), embedded with OpenAI `text-embedding-3-small`, and stored in Supabase pgvector. At query time, cosine similarity retrieves the top-5 relevant chunks.
- **Time-Aware AI:** The agent knows the current time and filters routines to show only upcoming events.
- **Medical Safety:** Lumen never gives medical advice from its own knowledge. It only shares medical information explicitly present in the caregiver's care documents. Otherwise, it redirects to the caregiver or doctor.
- **Multi-Patient Support:** A single caregiver can manage multiple patients, each with isolated data and unique access codes.
- **Message Approval Flow:** Family messages require caregiver approval before Lumen reads them aloud.
- **API Key Security:** All secret keys (`OPENAI_API_KEY`, `ELEVENLABS_API_KEY`, `SUPABASE_SERVICE_ROLE_KEY`) remain server-side. The frontend never sees them. ElevenLabs sessions are established through short-lived signed WebSocket URLs minted by the backend.

---

## Available Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start both frontend and backend concurrently |
| `npm run dev:frontend` | Start only the Vite dev server |
| `npm run dev:backend` | Start only the Express API server |
| `npm run build` | TypeScript check + production build of the frontend |
| `npm run install:all` | Install dependencies in both frontend and backend |

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, Vite 6, Tailwind CSS v4, TypeScript |
| Backend | Node.js, Express |
| Database | Supabase (PostgreSQL + pgvector) |
| AI / Embeddings | OpenAI API (`text-embedding-3-small`, `gpt-4o-mini`) |
| Voice | ElevenLabs Conversational AI SDK (`@elevenlabs/react`) |
| Auth | Custom JWT (bcryptjs + jsonwebtoken) |
| Dev Tooling | ngrok (webhook tunneling), concurrently |
