-- CALMS database, part 8: papers CALMS issues (statements, clearances, schedules, credit memos,
-- reports for the regulator), each with its own number, kept as issued. Safe to run again.
create table if not exists issued_papers (
  id         bigint generated always as identity primary key,
  kind       text not null check (kind in ('statement', 'clearance', 'schedule', 'memo', 'regulatory')),
  number     text not null unique,                    -- SOA-2026-0001, CL-2026-0001, SCH-…, MEMO-…, REG-…
  record     text not null,                           -- LN-…, APP-… or the report's name
  title      text not null,
  data       jsonb not null,                          -- exactly what was printed
  issued_by  uuid references users(id),               -- empty when CALMS made it on its schedule
  issued_at  timestamptz not null default now()
);
create index if not exists issued_papers_record_idx on issued_papers(record);
drop trigger if exists issued_papers_no_change on issued_papers;
create trigger issued_papers_no_change before update or delete on issued_papers for each row execute function documents_are_append_only();

-- The company's details for the letterhead.
insert into settings (key, value) values
  ('company', '{"name": "GR8 Lending Company", "address": "Malolos, Bulacan", "secNo": "", "caNo": "", "phone": "(044) 555 0142", "email": ""}')
on conflict (key) do nothing;
