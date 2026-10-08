-- CALMS database, part 4: Credit assessment and Decision (FR-301 onward). Safe to run again.

-- The thresholds the rules use, versioned. A decision records the version it was made under,
-- so an old decision can still be explained after the rules change.
create table if not exists rule_sets (
  version    integer primary key,
  policy     jsonb not null,
  is_active  boolean not null default false,
  created_at timestamptz not null default now()
);
insert into rule_sets (version, policy, is_active) values (14,
  '{"dtiMax": 45, "dtiAuto": 35, "dtiSoft": 40, "ltvMax": 80, "ltvAuto": 60, "fsMin": 580, "fsAuto": 670, "fsDecline": 500, "dtiDecline": 55, "autoMax": 200000, "yrs": 2}', true)
on conflict (version) do nothing;

-- Each credit bureau inquiry and what came back (simulated FinScore for this project).
create table if not exists bureau_reports (
  id             bigint generated always as identity primary key,
  application_id uuid not null references applications(id),
  outcome        text not null check (outcome in ('ok', 'down', 'blocked')),
  report_no      text,
  score          integer,
  tradelines     jsonb not null default '[]',
  public_records integer not null default 0,
  attempts       integer not null default 1,
  requested_by   uuid not null references users(id),
  requested_at   timestamptz not null default now(),
  received_at    timestamptz,
  took_ms        integer
);
create index if not exists bureau_reports_app_idx on bureau_reports(application_id);

-- What the rules said, at the terms that were asked for, the moment the report arrived.
create table if not exists assessments (
  id             bigint generated always as identity primary key,
  application_id uuid not null references applications(id),
  report_id      bigint references bureau_reports(id),
  rule_version   integer not null references rule_sets(version),
  amount         numeric(14,2) not null,
  term_months    integer not null,
  dti            numeric(6,2),
  ltv            numeric(6,2),
  score          integer,
  tier           text not null,
  outcome        text not null,
  why            text not null,
  memo           text not null,
  created_at     timestamptz not null default now()
);
create index if not exists assessments_app_idx on assessments(application_id);

-- The underwriter's decision and electronic signature.
create table if not exists decisions (
  id             bigint generated always as identity primary key,
  application_id uuid not null references applications(id),
  kind           text not null check (kind in ('asis', 'other', 'no', 'up')),
  amount         numeric(14,2),
  term_months    integer,
  reason         text,
  remarks        text,
  is_override    boolean not null default false,
  recommended    text,
  rule_version   integer references rule_sets(version),
  endorsed_to    text,
  decided_by     uuid not null references users(id),
  signature      text not null unique,
  decided_at     timestamptz not null default now()
);
create index if not exists decisions_app_idx on decisions(application_id);

alter table applications add column if not exists approved_amount numeric(14,2);
alter table applications add column if not exists approved_term   integer;

drop trigger if exists bureau_reports_no_change on bureau_reports;
create trigger bureau_reports_no_change before update or delete on bureau_reports for each row execute function documents_are_append_only();
drop trigger if exists assessments_no_change on assessments;
create trigger assessments_no_change before update or delete on assessments for each row execute function documents_are_append_only();
drop trigger if exists decisions_no_change on decisions;
create trigger decisions_no_change before update or delete on decisions for each row execute function documents_are_append_only();
