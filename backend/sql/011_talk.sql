-- "Let's talk" on the public site: a visitor tells GR8 what they need and how to reach them; staff call them back.
create table if not exists talk_requests (
  id bigserial primary key,
  need text not null,
  amount text,
  months text,
  name text not null,
  mobile text,
  email text,
  reach text,
  message text,
  ip text,
  status text not null default 'new',
  created_at timestamptz not null default now()
);
create index if not exists talk_requests_created on talk_requests (created_at desc);
