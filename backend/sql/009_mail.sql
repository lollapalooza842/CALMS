-- CALMS database, part 9: email. Every message CALMS sends waits here first, then is sent and kept. Safe to run again.
create table if not exists outbox (
  id           bigint generated always as identity primary key,
  to_address   text not null,
  to_user      uuid references users(id),             -- a staff notice
  to_borrower  uuid references borrowers(id),         -- a message to a borrower
  template     text,                                   -- message_templates.id, for borrower messages
  subject      text not null,
  body         text not null,
  record       text,                                   -- APP-… or LN-…
  dedupe       text unique,                            -- the same notice is never queued twice
  status       text not null default 'waiting' check (status in ('waiting', 'sent', 'failed')),
  attempts     integer not null default 0,
  last_error   text,
  created_at   timestamptz not null default now(),
  next_try_at  timestamptz not null default now(),
  sent_at      timestamptz
);
create index if not exists outbox_waiting_idx on outbox(status, next_try_at);
