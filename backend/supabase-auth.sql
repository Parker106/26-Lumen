create table if not exists public.lumen_users (
  id uuid primary key default gen_random_uuid(),
  email text unique not null,
  password_hash text not null,
  role text not null check (role in ('caregiver', 'family')),
  name text not null default '',
  created_at timestamptz default now()
);
create index if not exists lumen_users_email_idx on public.lumen_users (email);

create table if not exists public.lumen_patients (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  access_code text not null,
  household_id text unique not null,
  caregiver_id uuid not null references public.lumen_users(id) on delete cascade,
  created_at timestamptz default now()
);
create index if not exists lumen_patients_code_idx on public.lumen_patients (access_code);
create index if not exists lumen_patients_household_idx on public.lumen_patients (household_id);
create index if not exists lumen_patients_caregiver_idx on public.lumen_patients (caregiver_id);

create table if not exists public.lumen_patient_links (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.lumen_patients(id) on delete cascade,
  user_id uuid not null references public.lumen_users(id) on delete cascade,
  relationship text not null,
  created_at timestamptz default now(),
  unique(patient_id, user_id)
);

create table if not exists public.lumen_messages (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.lumen_patients(id) on delete cascade,
  sender_id uuid references public.lumen_users(id) on delete set null,
  sender_name text not null,
  sender_role text not null,
  text text not null,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  delivery_type text not null default 'immediate' check (delivery_type in ('immediate', 'scheduled')),
  scheduled_at timestamptz,
  delivered_at timestamptz,
  location text,
  estimated_return text,
  created_at timestamptz default now()
);
create index if not exists lumen_messages_patient_idx on public.lumen_messages (patient_id);
create index if not exists lumen_messages_status_idx on public.lumen_messages (status);

create table if not exists public.lumen_routines (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.lumen_patients(id) on delete cascade,
  time text not null,
  label text not null,
  recurring boolean not null default true,
  days_of_week text[] default null,
  created_at timestamptz default now()
);
create index if not exists lumen_routines_patient_idx on public.lumen_routines (patient_id);

alter table public.lumen_users enable row level security;
alter table public.lumen_patients enable row level security;
alter table public.lumen_patient_links enable row level security;
alter table public.lumen_messages enable row level security;
alter table public.lumen_routines enable row level security;
