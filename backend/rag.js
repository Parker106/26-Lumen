const path = require('path');
const fs = require('fs');

const DATA_DIR = path.join(__dirname, 'data');
const STORE_FILE = path.join(DATA_DIR, 'rag-store.json');

const CHUNK_SIZE = 400;
const CHUNK_OVERLAP = 50;
const EMBEDDING_MODEL = 'text-embedding-3-small';
const TOP_K = 5;

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

function chunkText(text, chunkSize = CHUNK_SIZE, overlap = CHUNK_OVERLAP) {
  const normalized = text.replace(/\s+/g, ' ').trim();
  if (!normalized) return [];
  const chunks = [];
  let start = 0;
  while (start < normalized.length) {
    let end = start + chunkSize;
    let chunk = normalized.slice(start, end);
    if (end < normalized.length) {
      const lastSpace = chunk.lastIndexOf(' ');
      if (lastSpace > chunkSize / 2) {
        end = start + lastSpace + 1;
        chunk = normalized.slice(start, end);
      }
    }
    if (chunk.trim()) chunks.push({ text: chunk.trim() });
    start = end - overlap;
    if (start >= normalized.length) break;
  }
  return chunks;
}

function cosineSimilarity(a, b) {
  if (a.length !== b.length) return 0;
  let dot = 0, normA = 0, normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  const denom = Math.sqrt(normA) * Math.sqrt(normB);
  return denom === 0 ? 0 : dot / denom;
}

class VectorStore {
  constructor() {
    this.items = [];
  }

  load() {
    ensureDataDir();
    try {
      if (fs.existsSync(STORE_FILE)) {
        const raw = fs.readFileSync(STORE_FILE, 'utf8');
        const data = JSON.parse(raw);
        this.items = Array.isArray(data.items) ? data.items : [];
        this.items.forEach((item) => {
          if (!item.householdId) item.householdId = 'default';
        });
      }
    } catch (e) {
      console.warn('RAG: could not load store:', e.message);
      this.items = [];
    }
  }

  save() {
    ensureDataDir();
    try {
      fs.writeFileSync(STORE_FILE, JSON.stringify({ items: this.items }, null, 0), 'utf8');
    } catch (e) {
      console.warn('RAG: could not save store:', e.message);
    }
  }

  removeDoc(householdId, docId) {
    const prefix = `${householdId}::${docId}::`;
    this.items = this.items.filter((item) => !item.id.startsWith(prefix));
  }

  addMany(entries) {
    for (const e of entries) {
      this.items.push(e);
    }
  }

  retrieve(queryEmbedding, householdId, k = TOP_K) {
    const scoped = this.items.filter((item) => item.householdId === householdId);
    if (scoped.length === 0) return [];
    const scored = scoped.map((item) => ({
      text: item.text,
      score: cosineSimilarity(item.embedding, queryEmbedding),
    }));
    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, k).map((s) => s.text);
  }

  countForHousehold(householdId) {
    return this.items.filter((i) => i.householdId === householdId).length;
  }

  totalCount() {
    return this.items.length;
  }

  clear() {
    this.items = [];
  }
}

const store = new VectorStore();

let supabase = null;
function useSupabase() {
  if (supabase !== null) return supabase;
  const url = (process.env.SUPABASE_URL || '').trim();
  const key = (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();
  if (!url || !key) {
    supabase = false;
    return false;
  }
  try {
    const { createClient } = require('@supabase/supabase-js');
    supabase = createClient(url, key);
    return supabase;
  } catch (e) {
    console.warn('RAG: Supabase init failed:', e.message);
    supabase = false;
    return false;
  }
}

async function embed(openai, texts) {
  if (!texts.length) return [];
  const res = await openai.embeddings.create({
    model: EMBEDDING_MODEL,
    input: texts,
  });
  return res.data.map((d) => d.embedding);
}

async function indexTextFile(openai, text, docId, householdId) {
  const chunks = chunkText(text);
  if (chunks.length === 0) return { chunks: 0 };
  const safeDoc = (docId || `doc-${Date.now()}`).replace(/[^a-zA-Z0-9_-]/g, '_');
  store.removeDoc(householdId, safeDoc);
  const texts = chunks.map((c) => c.text);
  const embeddings = await embed(openai, texts);
  const idPrefix = `${householdId}::${safeDoc}::`;
  const entries = chunks.map((c, i) => ({
    id: `${idPrefix}${i}`,
    text: c.text,
    embedding: embeddings[i],
    householdId,
  }));
  store.addMany(entries);
  store.save();
  return { chunks: entries.length };
}

async function indexTextSupabase(openai, sb, text, docId, householdId) {
  const chunks = chunkText(text);
  if (chunks.length === 0) return { chunks: 0 };
  const safeDoc = (docId || `doc-${Date.now()}`).replace(/[^a-zA-Z0-9_-]/g, '_');
  await sb.from('rag_chunks').delete().eq('household_id', householdId).eq('doc_id', safeDoc);
  const texts = chunks.map((c) => c.text);
  const embeddings = await embed(openai, texts);
  const rows = chunks.map((c, i) => ({
    household_id: householdId,
    doc_id: safeDoc,
    chunk_index: i,
    content: c.text,
    embedding: embeddings[i],
  }));
  const { error } = await sb.from('rag_chunks').insert(rows);
  if (error) throw new Error(error.message);
  return { chunks: rows.length };
}

async function indexText(openai, text, docId = null, householdId = 'default') {
  const sb = useSupabase();
  if (sb) return indexTextSupabase(openai, sb, text, docId, householdId);
  return indexTextFile(openai, text, docId, householdId);
}

async function retrieveFile(openai, query, householdId) {
  const scoped = store.items.filter((i) => i.householdId === householdId);
  if (scoped.length === 0) return [];
  const [queryEmbedding] = await embed(openai, [query]);
  return store.retrieve(queryEmbedding, householdId, TOP_K);
}

async function retrieveSupabase(openai, sb, query, householdId) {
  const [queryEmbedding] = await embed(openai, [query.trim()]);
  const { data, error } = await sb.rpc('match_rag_chunks', {
    query_embedding: queryEmbedding,
    match_count: TOP_K,
    filter_household: householdId,
  });
  if (error) {
    console.warn('RAG Supabase rpc:', error.message);
    return [];
  }
  return (data || []).map((r) => r.content).filter(Boolean);
}

async function retrieve(openai, query, householdId = 'default') {
  const sb = useSupabase();
  if (sb) return retrieveSupabase(openai, sb, query, householdId);
  return retrieveFile(openai, query, householdId);
}

async function countChunksSupabase(sb, householdId) {
  const { count, error } = await sb
    .from('rag_chunks')
    .select('*', { count: 'exact', head: true })
    .eq('household_id', householdId);
  if (error) return 0;
  return count || 0;
}

async function chunkStats(householdId) {
  const sb = useSupabase();
  if (sb) {
    const n = await countChunksSupabase(sb, householdId);
    return { chunks: n, backend: 'supabase' };
  }
  return { chunks: store.countForHousehold(householdId), backend: 'file' };
}

function loadStore() {
  store.load();
}

function getStore() {
  return store;
}

module.exports = {
  chunkText,
  embed,
  indexText,
  retrieve,
  loadStore,
  getStore,
  VectorStore,
  STORE_FILE,
  useSupabase: () => !!useSupabase(),
  chunkStats,
  TOP_K,
};
