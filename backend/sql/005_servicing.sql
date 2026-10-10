-- CALMS database, part 5: from the offer to the money (counter-offers, the borrower's answer, the loan
-- agreement, release, loan accounts and payments). Safe to run again.

-- Offers made to the borrower when the approved terms differ from the request (FR-401 onward).
create table if not exists counter_offers (
  id             bigint generated always as identity primary key,
  application_id uuid not null references applications(id),
  n              integer not null,                     -- offer 1, 2, ...
  amount         numeric(14,2) not null,
  term_months    integer not null,
  status         text not null default 'awaiting' check (status in ('awaiting', 'accepted', 'declined', 'withdrawn')),
  remarks        text,
  issued_by      uuid not null references users(id),
  issued_at      timestamptz not null default now(),
  unique (application_id, n)
);

-- The borrower's answer to an offer, with how they were told and the proof.
create table if not exists offer_answers (
  id           bigint generated always as identity primary key,
  offer_id     bigint not null unique references counter_offers(id),
  answer       text not null check (answer in ('accepted', 'declined')),
  channel      text not null,
  told_at      timestamptz not null,
  note         text,
  proof_doc    uuid references documents(id),
  recorded_by  uuid not null references users(id),
  recorded_at  timestamptz not null default now()
);

-- The loan agreement: when the disclosure statement was given, and the signed copy, locked.
create table if not exists agreements (
  id              bigint generated always as identity primary key,
  application_id  uuid not null unique references applications(id),
  amount          numeric(14,2) not null,
  term_months     integer not null,
  generated_by    uuid not null references users(id),
  generated_at    timestamptz not null default now(),
  disclosed_on    date,
  signed_on       date,
  signed_doc      uuid references documents(id),
  locked_by       uuid references users(id),
  locked_at       timestamptz
);

-- The account a released loan becomes, and its schedule.
create table if not exists loan_accounts (
  id              uuid primary key default gen_random_uuid(),
  number          text not null unique,                -- LN-2026-0163
  application_id  uuid not null unique references applications(id),
  principal       numeric(14,2) not null,
  monthly_rate    numeric(6,4) not null,
  interest_method text not null,
  term_months     integer not null,
  late_penalty    numeric(6,4) not null,
  released_on     date not null,
  closed_on       date,
  opened_at       timestamptz not null default now()
);

create table if not exists installments (
  id            bigint generated always as identity primary key,
  account_id    uuid not null references loan_accounts(id),
  n             integer not null,
  due_on        date not null,
  principal     numeric(14,2) not null,
  interest      numeric(14,2) not null,
  paid_principal numeric(14,2) not null default 0,
  paid_interest  numeric(14,2) not null default 0,
  paid_penalty   numeric(14,2) not null default 0,
  unique (account_id, n)
);

-- Money out: one release per loan.
create table if not exists disbursements (
  id             bigint generated always as identity primary key,
  application_id uuid not null unique references applications(id),
  account_id     uuid not null references loan_accounts(id),
  gross          numeric(14,2) not null,
  fee            numeric(14,2) not null,
  net            numeric(14,2) not null,
  channel        text not null,
  payee          jsonb not null,
  reference      text not null,
  released_by    uuid not null references users(id),
  released_at    timestamptz not null default now()
);

-- Money in. A payment is never edited or deleted; a mistake is undone by a reversal entry.
create table if not exists payments (
  id            bigint generated always as identity primary key,
  account_id    uuid not null references loan_accounts(id),
  receipt       text not null unique,                  -- OR-2026-000123
  amount        numeric(14,2) not null,                -- negative for a reversal
  paid_on       date not null,
  channel       text not null,
  reference     text,
  allocation    jsonb not null,                        -- [{ n, penalty, interest, principal }]
  reverses      bigint references payments(id),
  reason        text,
  posted_by     uuid not null references users(id),
  posted_at     timestamptz not null default now()
);
create index if not exists payments_account_idx on payments(account_id);

drop trigger if exists payments_no_change on payments;
create trigger payments_no_change before update or delete on payments for each row execute function documents_are_append_only();
drop trigger if exists disbursements_no_change on disbursements;
create trigger disbursements_no_change before update or delete on disbursements for each row execute function documents_are_append_only();
drop trigger if exists offer_answers_no_change on offer_answers;
create trigger offer_answers_no_change before update or delete on offer_answers for each row execute function documents_are_append_only();

-- Offers raised by decisions made before this table existed.
insert into counter_offers (application_id, n, amount, term_months, issued_by, issued_at, remarks)
  select d.application_id, 1, d.amount, d.term_months, d.decided_by, d.decided_at, d.remarks
    from decisions d join applications a on a.id = d.application_id
   where d.kind = 'other' and a.status = 'awaiting'
     and not exists (select 1 from counter_offers c where c.application_id = d.application_id);
