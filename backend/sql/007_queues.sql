-- CALMS database, part 7: My Queue, the Review queue and escalation. Safe to run again.

-- Who holds an application while it is Under Review. Empty means it waits in the arrivals basket.
alter table applications add column if not exists assigned_to uuid references users(id);
alter table applications add column if not exists assigned_at timestamptz;

-- Every move of a folder between desks, with the Lead's reason. Never changed.
create table if not exists assignments (
  id             bigint generated always as identity primary key,
  application_id uuid not null references applications(id),
  from_user      uuid references users(id),
  to_user        uuid not null references users(id),
  reason         text not null,
  moved_by       uuid references users(id),            -- empty when CALMS moved it (an endorsement upward)
  moved_at       timestamptz not null default now()
);
create index if not exists assignments_app_idx on assignments(application_id);
drop trigger if exists assignments_no_change on assignments;
create trigger assignments_no_change before update or delete on assignments for each row execute function documents_are_append_only();

-- An application that sat too long at one step is escalated once per stay at that step.
create table if not exists escalations (
  id             bigint generated always as identity primary key,
  application_id uuid not null references applications(id),
  status         text not null,
  status_since   timestamptz not null,
  hours          integer not null,
  escalated_at   timestamptz not null default now(),
  unique (application_id, status_since)
);
