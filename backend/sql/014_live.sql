-- Live chat on the public site: when Kuwa can't help, a visitor can talk to a real GR8 staff member.
-- The visitor holds a secret token (kept only in their browser for the visit); staff answer from pages/live-chat.html.
-- No ID numbers or account details are asked for here; the visitor gives only a first name.
create table if not exists live_chats (
  id              bigserial primary key,
  token           text not null,
  name            text not null,
  transcript      jsonb not null default '[]',      -- what the visitor and Kuwa said before the hand-over
  status          text not null default 'waiting',  -- waiting, open, closed
  agent_id        uuid,
  agent_name      text,
  visitor_seen_at timestamptz not null default now(),
  agent_seen_at   timestamptz,
  created_at      timestamptz not null default now(),
  closed_at       timestamptz
);
create index if not exists live_chats_status on live_chats (status, created_at desc);
create table if not exists live_messages (
  id       bigserial primary key,
  chat_id  bigint not null references live_chats(id) on delete cascade,
  sender   text not null,                             -- visitor, agent, system
  text     text not null,
  at       timestamptz not null default now()
);
create index if not exists live_messages_chat on live_messages (chat_id, id);
