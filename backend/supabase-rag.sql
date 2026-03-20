create extension if not exists vector;

create table if not exists public.rag_chunks (
  id uuid primary key default gen_random_uuid(),
  household_id text not null,
  doc_id text not null,
  chunk_index int not null,
  content text not null,
  embedding vector(1536) not null,
  created_at timestamptz default now()
);

create index if not exists rag_chunks_household_idx on public.rag_chunks (household_id);

create or replace function public.match_rag_chunks (
  query_embedding vector(1536),
  match_count int default 5,
  filter_household text default ''
)
returns table (content text, similarity float)
language sql
stable
as $$
  select
    rag_chunks.content,
    1 - (rag_chunks.embedding <=> query_embedding) as similarity
  from rag_chunks
  where rag_chunks.household_id = filter_household
  order by rag_chunks.embedding <=> query_embedding
  limit least(match_count, 20);
$$;

alter table public.rag_chunks enable row level security;
