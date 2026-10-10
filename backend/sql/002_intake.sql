-- CALMS database, part 2: what the New application and Application detail screens need.
-- Safe to run again (npm run db:setup runs every file in this folder in order).

-- The borrower as written on the government ID (FR-201).
alter table borrowers add column if not exists birth_date date;
alter table borrowers add column if not exists id_type    text;
alter table borrowers add column if not exists id_number  text;
create index if not exists borrowers_name_idx on borrowers (lower(regexp_replace(full_name, '\s+', ' ', 'g')));
create index if not exists borrowers_idno_idx on borrowers (id_type, id_number);

-- What the borrower is asking for and why, plus the product-specific answers
-- (employment for salary and personal loans, the business for SME loans).
alter table applications add column if not exists purpose      text;
alter table applications add column if not exists details      jsonb not null default '{}';
alter table applications add column if not exists submitted_at timestamptz;

-- Papers on file for an application. A paper is never replaced: a new scan is a new version (FR-204).
create table if not exists documents (
  id             uuid primary key default gen_random_uuid(),
  application_id uuid not null references applications(id),
  slot           text not null,                        -- consent, id, payslip, permit, ...
  version        integer not null default 1,
  file_name      text not null,
  mime_type      text not null check (mime_type in ('application/pdf', 'image/jpeg', 'image/png')),
  size_bytes     integer not null check (size_bytes > 0 and size_bytes <= 10485760),
  sha256         text not null,                        -- fingerprint, so a changed file can be detected
  uploaded_by    uuid not null references users(id),
  uploaded_at    timestamptz not null default now(),
  unique (application_id, slot, version)
);
create index if not exists documents_app_idx on documents(application_id);

-- The file itself, kept apart so listing documents never loads the bytes.
create table if not exists document_files (
  document_id uuid primary key references documents(id),
  bytes       bytea not null
);

-- Papers are evidence: they may be added, never changed or removed.
create or replace function documents_are_append_only() returns trigger language plpgsql as $$
begin
  raise exception 'documents are append-only; upload a new version instead';
end $$;
drop trigger if exists documents_no_change on documents;
create trigger documents_no_change before update or delete on documents
  for each row execute function documents_are_append_only();
drop trigger if exists document_files_no_change on document_files;
create trigger document_files_no_change before update or delete on document_files
  for each row execute function documents_are_append_only();
