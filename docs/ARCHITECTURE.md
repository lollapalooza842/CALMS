# CALMS architecture

How the real system is put together, what is built so far, and what to build next.

## The stack

| Part | Choice | Why |
|---|---|---|
| Front end | The existing HTML, CSS and JavaScript pages | Already designed and working; no rewrite. Each page swaps its sample data for API calls, one page at a time. |
| Back end | Node.js + Express | One language (JavaScript) on both sides. |
| Database | Supabase (hosted PostgreSQL) | A real relational database for money, schedules and the audit log, hosted free in the cloud as the SRS requires. |
| Files | Supabase Storage (planned) | Encrypted storage for uploaded documents (SRS 7.3). |
| Hosting | Any Node host (Render, Railway) + Supabase | One service runs both the API and the pages. |

## How a request flows

```
Browser (frontend/*.html)
   │  assets/js/api.js: fetch("/api/...") with the session cookie
   ▼
Express (backend/src/server.js)
   │  lib/auth.js: is there a valid session? does this role have access?
   ▼
routes/*.js: check the input, apply the business rule
   │  lib/audit.js: write a sealed audit entry in the same transaction
   ▼
Supabase PostgreSQL
```

The browser never talks to Supabase directly. Every rule in the SRS is enforced in the back
end, where a user cannot bypass it.

## Decisions worth knowing

- **Our own sign-in, not Supabase Auth.** The SRS asks for a lockout after five wrong
  attempts, a second factor for certain roles, a 15-minute idle limit and accounts that are
  deactivated but never deleted. These are simpler to guarantee and to explain when the
  rules live in our own `users` table and `lib/auth.js`.
- **Sessions are signed cookies** that last 15 minutes and are renewed on every request, so
  a session ends after 15 minutes without activity (FR-114). JavaScript in the page cannot
  read them.
- **The audit log is append-only twice over.** A database trigger refuses any update or
  delete (FR-107), and each entry carries a hash of the one before it, so tampering is
  detectable (`GET /api/audit/verify`).
- **Pages still open from the folder.** `api.js` sets `CALMS.online` to false under
  `file://`, and each page then uses its built-in sample data. The design prototype keeps
  working without a server.

## Built so far (sign-in, intake, underwriting, servicing, administration and oversight, and Phase 6: queues)

| Area | What works | SRS |
|---|---|---|
| Sign-in | Username and password, lockout at 5 wrong attempts, second factor for approval, disbursement and admin roles, sign out | FR-110 to FR-115, NFR-017 |
| Roles | Every API route checks the role; sales agents see only their own applications | FR-111 |
| Applications | List, read one with its stages, papers and audit trail | |
| New application | Products and agents from the database; every field checked again on the server; one active application per borrower and product (checked live while typing); the signed consent form is required and stored with the application; reference numbers from a yearly counter | FR-201 to FR-206 |
| Documents | Checklist per product; PDF, JPG or PNG up to 10 MB, checked by content not just name; a new scan is a new version and old versions are kept; papers can never be changed or deleted (database trigger); every opening is logged | FR-203, FR-204 |
| Encode and verify | A second loan processor checks every entry against the paper (no "all match" shortcut); the encoder cannot verify their own entries; mismatches go back with a reason; corrections keep the old value; verifying needs every paper on file and moves the application to Under Review | FR-207 to FR-209 |
| Credit assessment | Underwriter asks FinScore (simulated: the same borrower always gets the same report); no inquiry without the signed consent form (the attempt is logged); a bureau outage is recorded and leaves it in manual review; the rules give a tier and a recommendation and write the credit memo, stamped with the rule-set version | FR-301 onward |
| Decision | Four stamps (approve as asked, approve other terms, decline, endorse upward); the server checks the approval limit, that the decider did not encode it, the override rule (written justification), the decline reason and the authenticator code before signing; approving other terms moves it to Awaiting Borrower; every decision is append-only with a signature reference | |
| Counter-offers and the answer | Approving other terms raises offer 1; the assigned sales agent (or a processor) records the borrower's answer with how she was told and a proof file; after a decline the underwriter issues the next offer or rejects, with the authenticator code; offers and answers cannot be changed | FR-401 onward |
| Loan agreement | Drawn up at the accepted (or approved) terms with its disclosure statement and schedule; the disclosure date is recorded first; the signed scan is uploaded, checked against that date, and locked | |
| Release | Only accepted loans with a locked agreement reach the shelf; the disbursement officer checks the ID, types the payout account twice, picks a channel within its limits and releases with the authenticator code; a loan account opens with its schedule; a loan is released once | |
| Loan accounts and payments | Balances, days past due, buckets and late penalties worked out as of today; payments split per installment, oldest first, penalty then interest then principal; the same reference cannot be posted twice; a payment is never edited, only reversed by a different person with a reason, newest first | |
| Users and roles | The System Administrator adds people (a one-time password is shown once; they choose their own at first sign-in), changes role, approval limit and second factor, unlocks, resets passwords, deactivates with a reason and reactivates. Nobody is deleted, nobody changes their own role, the last administrator cannot be removed. A role change or deactivation ends the person's sessions at once | FR-111, FR-115 |
| Products and rules | Terms, papers and credit lines are edited as a draft and published as a new rule-set version with a reason; old decisions keep their version. The papers list drives each product's checklist; the idle sign-out minutes and escalation hours are office settings | FR-301 (rules), FR-114 |
| Audit log page | The last 30 days in words (before and after), filters, the real seal check, CSV or PDF export; checking and exporting are themselves logged | FR-104 to FR-109 |
| Reports | This month, last month, last three months: applications, decisions, turnaround, collection, officer productivity, where applications wait, and aging as of today, all from the records; exports are logged | |
| Notifications | Built from the audit log: what others did on applications you worked on, and what waits on your role ("Needs you"); read state per person; new ones arrive every 30 seconds. Amounts and credit details are never shown in a notice | |
| System | Rings the database, the audit seals, the FinScore stand-in and document storage, keeps 24 hours of history; email and SMS are shown as not connected; jobs can be run now; message templates are edited with the no-amounts rule checked on the server | |
| My profile | Mobile number, notice choices and quiet hours, password change (12 characters, three kinds, not one of the last five; ends every other session), turning a second factor on with an authenticator key (or off, where the role allows), signing out everywhere else | NFR-016, FR-112 |
| My Queue | Each person's real work, oldest first, built from the records for their role (drafts, missing papers, returns and verifications for processors; the review desk and declined offers for underwriters; releases; past-due and due accounts; offers to deliver; overrides and exceptions; locked accounts and failing services; escalations for the Operations Manager). Every button opens the screen that does the job | |
| Review queue | Every application Under Review in an arrivals basket or on an underwriter's desk. Only the Lead Underwriter moves folders, with one of four reasons, and every move is kept. While a folder is on a desk only that underwriter (or the Lead) can run the assessment or decide it; an endorsement upward moves it to the Lead's desk | |
| Escalation | Every five minutes the server looks for applications that have sat at one step longer than the escalation hours (Products and rules). Each is written to the audit log once per stay; the Operations Manager and the people on it are notified | |
| Side rail | Online, the rail holds only the drawers the signed-in role may open, with the My Queue count and unread notices | FR-111 |
| Papers | Statement of account, payment schedule, clearance (fully paid loans only, issued once), credit memo, and the three reports for the regulator are issued by the server with their own numbers (SOA-, SCH-, CL-, MEMO-, REG-), kept exactly as issued, logged, and printed on the company letterhead ("Save as PDF" in the print window). The regulator's reports are also made by themselves: the monthly two on the 5th, the audit extract every Monday | |
| Email | Optional. With `SMTP_USER` and `SMTP_PASS` (a Gmail app password) in `.env`, CALMS emails staff the notices they ticked under Email on My profile (quiet hours respected), emails borrowers the message templates (received, decided, released, payment due in three days, newly past due), and can email a statement or schedule to the borrower. Every email waits in the outbox first and is tried three times, 15 minutes apart. Addresses ending in `.example` are never sent to. SMS is not connected | |
| Navigation | The application you are working on is carried across every drawer and button; a one-application screen opened without one asks which | |
| Privacy | ID numbers are masked; showing the full number is logged | NFR (data minimisation) |
| Audit | Sign-ins, failures, submissions, papers filed and opened, ID numbers shown, returns, corrections and verifications are recorded and sealed | FR-104 to FR-107 |
| Front end | Sign-in, Applications, New application, Application detail, Documents, and Encode and verify use the API (open them with `?ref=APP-…`); every inner page shows the signed-in user and redirects to sign-in when the session ends | |

### API so far

| Method and path | Who | What it does |
|---|---|---|
| `GET /api/health` | anyone | Server and database are reachable |
| `POST /api/auth/login` | anyone | Password step. Answers `{step:"mfa"}` or `{step:"done", user}` |
| `POST /api/auth/verify` | after the password step | Second-factor step |
| `POST /api/auth/logout` | signed in | Ends the session |
| `GET /api/auth/me` | signed in | The current user |
| `GET /api/applications` | agent, processor, underwriters, manager, auditor | The list |
| `GET /api/applications/new/options` | agent, processor | Products and sales agents for the form |
| `GET /api/applications/new/check` | agent, processor | Is there already an active application for this borrower and product? |
| `POST /api/applications` | agent, processor | Submit a new application with its signed consent form |
| `GET /api/applications/:ref` | readers | One application: borrower (ID masked), request, stages, checklist, papers, audit trail |
| `POST /api/applications/:ref/reveal-id` | readers | The full ID number; the look is logged |
| `POST /api/applications/:ref/documents` | agent, processor | File a paper (a new version if that slot has one) |
| `GET /api/applications/:ref/documents/:id` | readers | The file itself; the opening is logged |
| `GET /api/applications/:ref/verification` | readers | Entries grouped by paper, with the last round's marks |
| `POST /api/applications/:ref/verification` | processor who did not encode it | Verify (moves to Under Review) or return with reasons |
| `POST /api/applications/:ref/corrections` | the encoder | Correct returned entries and resubmit |
| `GET /api/applications/:ref/assessment` | readers | Verified figures, policy, report, saved assessment, inquiry log |
| `POST /api/applications/:ref/bureau` | underwriters | Ask FinScore (simulated), then run and record the rules |
| `GET /api/applications/:ref/decision` | readers | Terms, recommendation, your limit, the checks, any decision already signed |
| `POST /api/applications/:ref/decision` | underwriters | Sign a decision with the authenticator code |
| `GET /api/applications/:ref/offers` | everyone who works on it | Offers, answers and what can be done next |
| `POST /api/applications/:ref/offers/:n/answer` | the assigned agent, a processor | The borrower's answer, with proof |
| `POST /api/applications/:ref/offers` | underwriters | The next offer after a decline (code required) |
| `POST /api/applications/:ref/reject` | underwriters | Reject after a decline (code required) |
| `GET /api/applications/:ref/agreement` | everyone who works on it | Terms, schedule, disclosure and signing state |
| `POST /api/applications/:ref/agreement/disclosure` | processor | The disclosure statement was given on a date |
| `POST /api/applications/:ref/agreement/signed` | processor | Upload and lock the signed agreement |
| `GET/POST /api/applications/:ref/release` | disbursement officer | Release the money (code required); opens the loan account |
| `GET /api/disbursements` | servicing roles | The shelf, the held-back list and today's releases |
| `GET /api/loan-accounts`, `/:no` | servicing roles | Accounts and where they stand; one account in full |
| `GET /api/loan-accounts/:no/allocation` | servicing roles | How a payment would be split (nothing saved) |
| `POST /api/loan-accounts/:no/payments` | loan account officer | Post a payment |
| `POST /api/loan-accounts/:no/payments/:receipt/reverse` | account officer, operations manager | Reverse a payment (not your own) |
| `GET /api/audit/verify` | auditor, administrator | Re-checks every audit seal |
| `GET /api/audit` · `POST /api/audit/check` · `POST /api/audit/export` | auditor, administrator | Entries in words; the logged seal check; log an export |
| `GET /api/reports` · `POST /api/reports/export` | manager, auditor, administrator | Every report's numbers; log an export |
| `GET /api/notifications` · `POST /api/notifications/read` | signed in | Your notices; mark read, new, or all read |
| `GET /api/me` and `/api/me/*` | signed in | Your own profile, mobile, notices, password, second factor, other sessions |
| `GET/POST /api/users`, `PATCH /api/users/:u`, `POST /api/users/:u/(unlock\|reactivate\|deactivate\|reset-password)` | administrator | Accounts |
| `GET /api/products-rules` · `POST /api/rule-sets` | read: manager, auditor, administrator; publish: administrator | Products, rules, history; publish a version |
| `GET /api/queue` · `GET /api/rail` | signed in | Your My Queue; the rail's drawers counts |
| `GET /api/review-queue` · `POST /api/review-queue/assign` | read: underwriters, operations manager; move: Lead Underwriter | The desks; move a folder with a reason |
| `POST /api/loan-accounts/:no/statement` · `/schedule` · `GET/POST …/clearance` | servicing roles (clearance: account officer) | Issue a paper |
| `POST /api/applications/:ref/memo` | credit roles | The credit memo as a paper |
| `GET /api/regulatory` · `POST /api/regulatory/:kind/run` · `GET /api/papers/:number` | manager, auditor, administrator (reprints: by paper) | The regulator's reports; any paper again |
| `GET/PUT /api/settings/company` | administrator to change | The letterhead |
| `GET /api/system/health` · `POST /api/system/jobs/:id` · `GET/PUT /api/templates` | administrator | Health, jobs, message wording |

## Database

Built now: `users`, `loan_products`, `borrowers`, `applications`, `application_stages`,
`counters`, `audit_log` (`001_schema.sql`); `documents`, `document_files` (`002_intake.sql`);
`verifications`, `corrections` (`003_verification.sql`); `rule_sets`, `bureau_reports`,
`assessments`, `decisions` (`004_underwriting.sql`); `counter_offers`, `offer_answers`,
`agreements`, `loan_accounts`, `installments`, `disbursements`, `payments` (`005_servicing.sql`);
`password_history`, `settings`, `notification_reads`, `message_templates`, `health_checks`, and new
columns on `users`, `rule_sets` and `loan_products` (`006_admin.sql`); `assignments`, `escalations` and
`applications.assigned_to` (`007_queues.sql`); `issued_papers` and the company letterhead (`008_papers.sql`); `outbox` (`009_mail.sql`).

Papers are stored in the database (`document_files`, as bytes) rather than in Supabase Storage,
so there is one place to back up and no second key to manage. Supabase's free plan allows
500 MB, roughly a few hundred scanned papers. If that runs short, move `document_files` to
Supabase Storage; nothing else needs to change.

Notices are not a table of their own: a notice is an audit entry, so `notification_reads` only
records which ones each person has read.

## What to build next

Follow the order a loan moves in, so each module has real data from the one before it:

1. ~~New application and Application detail~~ (done)
2. ~~Documents~~ (done)
3. ~~Encode and verify~~ (done)
4. ~~Credit assessment and Decision~~ (done)
5. ~~Counter-offers, Record answer, Loan agreement~~ (done)
6. ~~Disbursement queue and Release loan~~ (done)
7. ~~Loan accounts, Loan account detail, Post payment~~ (done)
8. ~~Reports, Audit log page, Users and roles, Products and rules, System, Notifications, My profile~~ (done)
9. ~~My Queue and Review queue from real data; the side-rail drawers each role sees~~ (done)
10. **Traceability and a full test pass, clean demo data, the Windows installer, hosting, the demo script.**

For each module the steps are the same:

1. add its tables in a new `sql/00N_*.sql` file;
2. add a `routes/*.js` file with the role checks and an audit entry for every change;
3. in the page's script, wrap the start in `CALMS.boot("/api/...", ...)` and use the result
   in place of the sample data, as `assets/js/applications.js` does;
4. add checks for it to `scripts/smoke-test.js`.

## Not done yet, on purpose

- Seeded accounts share a demo authenticator secret, and outside production the code in
  `DEV_MFA_CODE` is also accepted. Set `NODE_ENV=production` for real use.
- The regulator's reports are laid out as formal reports on the letterhead, not on an official SEC
  template; match the columns to the template the SEC or your adviser gives you.
- SMS is not connected (it needs a paid Philippine provider such as Semaphore). Email is connected only
  when `SMTP_USER` and `SMTP_PASS` are set.
- Audit seals: before October 2026 two entries written at the same moment could both be sealed against the
  same earlier entry, which the seal check reports as broken. `npm run audit:check` explains each break;
  intact "out of order" entries can be acknowledged on the record with `-- --acknowledge`. An entry whose
  contents were changed can never be acknowledged.
- Backups are Supabase's own nightly backups; CALMS does not run them.
- Nothing is deployed. Everything runs on your own computer until you host it.
