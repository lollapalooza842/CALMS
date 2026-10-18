-- Applications sent from the public site (frontend/trail). They land here, checked with the same rules as the
-- New application screen (lib/intake.js); a loan processor then calls the borrower and encodes it in CALMS.
create table if not exists web_applications (
  id bigserial primary key,
  reference text not null unique,             -- W-2026-0001
  product text not null,
  amount numeric(14,2) not null,
  term_months integer not null,
  purpose text not null,
  full_name text not null,
  birth_date date not null,
  id_type text not null,
  id_number text not null,
  mobile text not null,
  email text,
  address text not null,
  details jsonb not null default '{}'::jsonb,
  consents jsonb not null default '{}'::jsonb,
  signature text,                             -- the signature drawn on screen, as a PNG data URL
  status text not null default 'received',    -- received -> called -> encoded (then it lives in applications)
  ip text,
  created_at timestamptz not null default now()
);
create index if not exists web_applications_created on web_applications (created_at desc);
create table if not exists web_application_files (
  id bigserial primary key,
  web_application_id bigint not null references web_applications(id) on delete cascade,
  slot text not null,
  file_name text not null,
  mime_type text not null,
  size_bytes integer not null,
  sha256 text not null,
  bytes bytea not null,
  created_at timestamptz not null default now()
);
