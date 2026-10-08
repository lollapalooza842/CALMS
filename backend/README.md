# CALMS back end

Node.js + Express, with the data in a Supabase (PostgreSQL) database. It serves the API
under `/api` and the front end (`../frontend`) under `/`, so one address runs the whole system.

## Set up (once)

1. **Install Node.js 18 or newer** from nodejs.org.
2. **Create a Supabase project** at supabase.com (the free plan is enough). Choose a region
   close to you, such as Singapore, and keep the database password it asks you to set.
3. **Get the connection string.** In the project: Connect > Connection string > URI, and choose
   the **Session pooler**. Replace `[YOUR-PASSWORD]` with the database password.
4. **Make your settings file.** In this folder, copy `.env.example` to `.env` and fill in
   `DATABASE_URL` and `SESSION_SECRET` (the file explains how to generate one).
5. **Install and create the tables:**

   ```
   npm install
   npm run db:setup
   npm run db:seed
   ```

   `db:seed` adds 12 staff accounts, 3 loan products and 12 applications. It does nothing if
   the database already has users.

## Run

```
npm start
```

Then open http://localhost:3000. Sign in with any seeded account, for example:

| Username | Role | Second factor |
|---|---|---|
| `liza.mendoza` | Loan Processor | no |
| `jun.espiritu` | Sales Agent | no |
| `antonio.reyes` | Lead Underwriter | yes |
| `corazon.ilagan` | Disbursement Officer | yes |
| `regina.sy` | Compliance Auditor | no |
| `paolo.ventura` | System Administrator | yes |

Every seeded password is `Kuwa-guards-2026`. Where a second factor is asked for, type the
`DEV_MFA_CODE` from your `.env` (246810), or add the demo secret `JBSWY3DPEHPK3PXP` to an
authenticator app. **Change the passwords and remove `DEV_MFA_CODE` before anyone outside the
group can reach the system.**

`npm run dev` restarts the server whenever you save a file.

## Check that it works

With the server running, in a second terminal:

```
npm test
```

It signs in as several roles and checks the rules: wrong passwords, the second factor, who may
see or create applications, and that the audit seal is unbroken.

## What is here

```
backend/
├── src/
│   ├── server.js            starts Express, mounts the API and the front end
│   ├── db.js                the database connection
│   ├── lib/
│   │   ├── auth.js          sessions, the 15-minute idle limit, role checks
│   │   ├── audit.js         writes and verifies the sealed audit log
│   │   └── totp.js          6-digit authenticator codes
│   └── routes/
│       ├── auth.js          sign in, second factor, sign out
│       └── applications.js  list, read and create applications
├── sql/001_schema.sql       the tables
└── scripts/                 db-setup, db-seed, smoke-test
```

The design, the full table list and the order to build the rest in are in
`../docs/ARCHITECTURE.md`.
