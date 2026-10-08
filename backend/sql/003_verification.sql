-- CALMS database, part 3: Encode and verify, the maker-checker step (FR-207 to FR-209).
-- A second loan processor checks every encoded entry against the papers. Safe to run again.

-- Where the check stands while the application is Submitted: waiting for a checker,
-- returned to the encoder for corrections, or verified (the application then moves to Under Review).
alter table applications add column if not exists check_state text not null default 'waiting';
do $$ begin
  alter table applications add constraint applications_check_state_ok check (check_state in ('waiting', 'returned', 'verified'));
exception when duplicate_object then null; end $$;
update applications set check_state = 'verified' where status not in ('draft', 'submitted') and check_state = 'waiting';

-- Each round of checking: who checked, the outcome, and the mark on every entry.
create table if not exists verifications (
  id             bigint generated always as identity primary key,
  application_id uuid not null references applications(id),
  verifier       uuid not null references users(id),
  outcome        text not null check (outcome in ('verified', 'returned')),
  checks         jsonb not null,                      -- { "name": "ok", "idno": "flag", ... }
  flags          jsonb not null default '{}',         -- { "idno": { "reason": "...", "note": "..." } }
  at             timestamptz not null default now()
);
create index if not exists verifications_app_idx on verifications(application_id);

-- Every correction the encoder made after a return, with the value before and after.
create table if not exists corrections (
  id             bigint generated always as identity primary key,
  application_id uuid not null references applications(id),
  field          text not null,
  before         text,
  after          text,
  corrected_by   uuid not null references users(id),
  at             timestamptz not null default now()
);
create index if not exists corrections_app_idx on corrections(application_id);

drop trigger if exists verifications_no_change on verifications;
create trigger verifications_no_change before update or delete on verifications
  for each row execute function documents_are_append_only();
drop trigger if exists corrections_no_change on corrections;
create trigger corrections_no_change before update or delete on corrections
  for each row execute function documents_are_append_only();
