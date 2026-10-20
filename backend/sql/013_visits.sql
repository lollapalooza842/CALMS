-- Visits to the public website (frontend/trail). Counts only, no names: one row each time a page opens or a part of it
-- (About, Loans, Let's talk, Apply) is opened for the first time in a visit. "visitor" is a one-way code made from the
-- day, the address and the browser, so the same person on the same day counts once; it cannot be turned back into an
-- address and changes every day. No address, no cookie, nothing that says who someone is.
create table if not exists site_visits (
  id        bigserial primary key,
  at        timestamptz not null default now(),
  day       date not null default (now() at time zone 'Asia/Manila')::date,
  visitor   text not null,
  kind      text not null default 'open',      -- 'open' (the page opened) or 'part' (a part of it was opened)
  part      text,                              -- home, about, loans, talk, apply
  ref_host  text,                              -- where they came from (only the site name, e.g. facebook.com)
  device    text                               -- phone, tablet or computer
);
create index if not exists site_visits_day on site_visits (day);
