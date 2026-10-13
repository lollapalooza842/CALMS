-- Work saved on a computer while it was offline, sent later. Each saved item carries its own key; the first answer
-- the server gave for that key is kept, so sending the same item again (a retry, a second tab) never does it twice.
create table if not exists idempotency_keys (
  key text primary key,
  user_id uuid not null,
  method text not null,
  path text not null,
  status int,
  body jsonb,
  done boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists idempotency_keys_created on idempotency_keys (created_at);
