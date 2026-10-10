-- CALMS database, part 1: the tables the first working slice needs.
-- Run this once in Supabase (SQL Editor > New query > paste > Run), or with: npm run db:setup
-- It is safe to run again: every statement checks before it creates.

create extension if not exists pgcrypto;

-- People who can sign in. Accounts are deactivated, never deleted (FR-115).
create table if not exists users (
  id              uuid primary key default gen_random_uuid(),
  username        text not null unique,
  full_name       text not null,
  short_name      text not null,                      -- "L. Mendoza", as shown in lists
  email           text not null unique,
  role            text not null check (role in (
                    'sales_agent', 'loan_processor', 'underwriter', 'lead_underwriter',
                    'disbursement_officer', 'loan_account_officer', 'operations_manager',
                    'compliance_auditor', 'system_administrator')),
  approval_limit  numeric(14,2),                      -- underwriters only (BR: approval authority)
  password_hash   text not null,
  mfa_enabled     boolean not null default false,
  mfa_secret      text,                               -- base32 TOTP secret
  failed_attempts integer not null default 0,         -- locked at 5 (NFR-017)
  locked_at       timestamptz,
  is_active       boolean not null default true,
  created_at      timestamptz not null default now()
);

create table if not exists loan_products (
  id             uuid primary key default gen_random_uuid(),
  name           text not null unique,
  min_amount     numeric(14,2) not null,
  max_amount     numeric(14,2) not null,
  terms_months   integer[] not null,
  monthly_rate   numeric(6,4) not null,               -- 0.0150 = 1.5% a month
  interest_method text not null check (interest_method in ('diminishing', 'flat')),
  processing_fee numeric(6,4) not null,
  late_penalty   numeric(6,4) not null
);

create table if not exists borrowers (
  id          uuid primary key default gen_random_uuid(),
  full_name   text not null,
  mobile      text,
  email       text,
  address     text,
  created_at  timestamptz not null default now()
);

create table if not exists applications (
  id            uuid primary key default gen_random_uuid(),
  reference     text not null unique,                 -- APP-2026-0409
  borrower_id   uuid not null references borrowers(id),
  product_id    uuid not null references loan_products(id),
  amount        numeric(14,2) not null check (amount > 0),
  term_months   integer not null check (term_months > 0),
  status        text not null default 'draft' check (status in (
                  'draft', 'submitted', 'review', 'approved', 'awaiting',
                  'accepted', 'funded', 'declined', 'rejected')),
  status_since  timestamptz not null default now(),
  agent_id      uuid references users(id),            -- the sales agent, if any
  encoded_by    uuid not null references users(id),
  created_at    timestamptz not null default now()
);
create index if not exists applications_status_idx on applications(status);

-- Every stage an application has left, who held it and for how long.
create table if not exists application_stages (
  id             bigint generated always as identity primary key,
  application_id uuid not null references applications(id),
  status         text not null,
  handled_by     uuid references users(id),
  entered_at     timestamptz not null,
  left_at        timestamptz not null
);
create index if not exists application_stages_app_idx on application_stages(application_id);

-- Yearly counter for application numbers.
create table if not exists counters (
  name  text primary key,
  value integer not null
);

-- The audit log (FR-104 to FR-109). Each entry carries a seal made from the entry before it.
create table if not exists audit_log (
  id         bigint generated always as identity primary key,
  at         timestamptz not null default now(),
  user_id    uuid references users(id),
  actor      text not null,                           -- name at the time, or "CALMS" / "Unknown"
  kind       text not null,                           -- login, data, status, decision, doc, bureau, pay, config, audit
  action     text not null,
  record     text,
  before     jsonb,
  after      jsonb,
  ip         text,
  prev_seal  text not null,
  seal       text not null
);

-- Nobody may change or delete an audit entry, not even an administrator (FR-107).
create or replace function audit_log_is_append_only() returns trigger language plpgsql as $$
begin
  raise exception 'audit_log is append-only';
end $$;
drop trigger if exists audit_log_no_change on audit_log;
create trigger audit_log_no_change before update or delete on audit_log
  for each row execute function audit_log_is_append_only();
