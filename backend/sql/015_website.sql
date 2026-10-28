-- The public website, joined to CALMS. Everything a customer does on the website lands in front of GR8 staff on the
-- Website screen (pages/website.html): online applications, "Let's talk" call-back requests, live chats, and what a
-- borrower sends from My GR8 (an answer to a counter-offer, a missing paper, word of a payment made).
-- What a borrower sends is a REQUEST: staff check it and then do the real thing with the usual screen (record the
-- answer, file the paper, post the payment), so every official record is still made, signed and audited by staff.

-- online applications: who handled them, and the CALMS application they became
alter table web_applications add column if not exists application_id uuid references applications(id);
alter table web_applications add column if not exists handled_by uuid references users(id);
alter table web_applications add column if not exists handled_at timestamptz;
alter table web_applications add column if not exists staff_note text;

-- "Let's talk" call-backs: who called, when, and what came of it
alter table talk_requests add column if not exists handled_by uuid references users(id);
alter table talk_requests add column if not exists handled_at timestamptz;
alter table talk_requests add column if not exists staff_note text;

-- My GR8 sign-in: a 6-digit code texted to the borrower's mobile number (only a fingerprint of it is kept)
create table if not exists borrower_codes (
  id         bigserial primary key,
  mobile     text not null,                      -- the last 10 digits, 9XXXXXXXXX
  code_hash  text not null,
  tries      integer not null default 0,
  expires_at timestamptz not null,
  used_at    timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists borrower_codes_mobile on borrower_codes (mobile, created_at desc);

-- what a signed-in borrower sends from My GR8
create table if not exists web_requests (
  id             bigserial primary key,
  kind           text not null check (kind in ('offer', 'paper', 'payment')),
  mobile         text not null,                  -- the borrower's number it came from (last 10 digits)
  borrower_name  text not null,
  application_id uuid references applications(id),
  account_id     uuid references loan_accounts(id),
  offer_id       bigint references counter_offers(id),
  details        jsonb not null default '{}',    -- offer: { answer }; paper: { slot, label, file_name, mime, size, sha256 }; payment: { amount, channel, reference, paid_on }
  status         text not null default 'new' check (status in ('new', 'done', 'dismissed')),
  handled_by     uuid references users(id),
  handled_at     timestamptz,
  staff_note     text,
  created_at     timestamptz not null default now()
);
create index if not exists web_requests_status on web_requests (status, created_at desc);
create table if not exists web_request_files (
  request_id bigint primary key references web_requests(id) on delete cascade,
  bytes      bytea not null
);
