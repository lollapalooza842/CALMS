-- CALMS database, part 6: administration and oversight (Users and roles, Products and rules,
-- Notifications, System, My profile). Safe to run again.

-- People: how to reach them, how they want to be told, and sessions they can end.
alter table users add column if not exists mobile text;
alter table users add column if not exists branch text not null default 'Malolos';
alter table users add column if not exists notify_prefs jsonb;            -- [[app, email, text], ...] per notice kind
alter table users add column if not exists quiet_hours jsonb;             -- { on, from, to }
alter table users add column if not exists session_version integer not null default 0; -- raised to sign out everywhere
alter table users add column if not exists password_changed_at timestamptz;
alter table users add column if not exists must_change_password boolean not null default false;
alter table users add column if not exists deactivated_at timestamptz;
alter table users add column if not exists deactivated_reason text;
alter table users add column if not exists last_sign_in_at timestamptz;

-- The last passwords each person used, so a new one cannot repeat them (kept: five).
create table if not exists password_history (
  id         bigint generated always as identity primary key,
  user_id    uuid not null references users(id),
  hash       text not null,
  created_at timestamptz not null default now()
);
create index if not exists password_history_user_idx on password_history(user_id);

-- Who published each rule set and why, and what changed.
alter table rule_sets add column if not exists created_by uuid references users(id);
alter table rule_sets add column if not exists reason text;
alter table rule_sets add column if not exists changes jsonb;

-- The papers each product asks for, as [[slot, label], ...]. Empty means the built-in list.
alter table loan_products add column if not exists required_docs jsonb;

-- Settings that apply to the whole office.
create table if not exists settings (
  key        text primary key,
  value      jsonb not null,
  updated_by uuid references users(id),
  updated_at timestamptz not null default now()
);
insert into settings (key, value) values ('escalation_hours', '48'), ('idle_minutes', '15') on conflict (key) do nothing;

-- Which notices each person has read. A notice is an audit entry, so nothing else needs storing.
create table if not exists notification_reads (
  user_id  uuid not null references users(id),
  audit_id bigint not null references audit_log(id),
  read_at  timestamptz not null default now(),
  primary key (user_id, audit_id)
);

-- The wording of the messages CALMS sends.
create table if not exists message_templates (
  id          text primary key,
  name        text not null,
  audience    text not null check (audience in ('Borrower', 'Staff')),
  mandatory   boolean not null default false,
  by_email    boolean not null default true,
  by_sms      boolean not null default true,
  by_app      boolean not null default false,
  subject     text not null,
  body        text not null,
  sort        integer not null default 0,
  updated_by  uuid references users(id),
  updated_at  timestamptz not null default now()
);
insert into message_templates (id, name, audience, mandatory, by_email, by_sms, by_app, subject, body, sort) values
  ('recv', 'Application received', 'Borrower', false, true, true, false, 'We have your application {application_no}', 'GR8 Lending: Hi {first_name}, we received your application {application_no}. {agent_name} will be in touch. Questions? Call {branch_phone}.', 1),
  ('docs', 'Papers missing', 'Borrower', false, true, true, false, 'A paper is missing from {application_no}', 'GR8 Lending: Hi {first_name}, we still need a paper for {application_no}. {agent_name} will tell you which one. Call {branch_phone}.', 2),
  ('dec', 'Decision made', 'Borrower', true, true, true, false, 'A decision on {application_no}', 'GR8 Lending: Hi {first_name}, there is a decision on {application_no}. {agent_name} will explain it to you. Call {branch_phone}.', 3),
  ('rel', 'Money released', 'Borrower', true, true, true, false, 'Your loan has been released', 'GR8 Lending: Hi {first_name}, your loan has been released. Your first payment is due {due_date}. Your account is {account_no}.', 4),
  ('due', 'Payment due soon', 'Borrower', false, true, true, false, 'A payment is due {due_date}', 'GR8 Lending: Hi {first_name}, a payment on {account_no} is due {due_date}. For the amount, call {branch_phone} or ask {agent_name}.', 5),
  ('late', 'Payment past due', 'Borrower', true, true, true, false, 'A payment on {account_no} is past due', 'GR8 Lending: Hi {first_name}, a payment on {account_no} is past due. Please call {branch_phone} or {agent_name}.', 6),
  ('esc', 'Application waiting too long', 'Staff', true, true, false, true, '{application_no} has waited 40 hours', 'CALMS: {application_no} has waited 40 hours. It escalates at 48.', 7)
on conflict (id) do nothing;

-- Health checks the System page ran, so it can show the last 24 hours.
create table if not exists health_checks (
  id         bigint generated always as identity primary key,
  service    text not null,
  status     text not null check (status in ('ok', 'slow', 'down', 'off')),
  took_ms    integer,
  detail     text,
  checked_at timestamptz not null default now()
);
create index if not exists health_checks_service_idx on health_checks(service, checked_at);
