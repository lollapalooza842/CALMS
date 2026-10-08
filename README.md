# CALMS

Credit Approval and Loan Management System for GR8 Lending Company.
CPE-3C Group 2-3, Bulacan State University.

This repository holds the front end (25 screens with the frontier-bank look and
KUWA, the owl mascot) and the start of the real back end: Node.js + Express over
a Supabase database. Sign-in and the Applications page already use it; the other
screens still run on sample data written into their own scripts.

To run the real system, follow `backend/README.md`. The design and build plan are
in `docs/ARCHITECTURE.md`.

## Open the design prototype

Open `frontend/index.html` in a browser. There is nothing to install or build.
The intro plays every time the page is opened, except when you return to it by
signing out.

All fonts are inside the project (`frontend/assets/fonts/`), so the pages look
the same with no internet connection.

## Run it as an app

CALMS runs two ways as an app. Both use the same screens; nothing is copied.

**Desktop app (Windows, also Mac and Linux).** Needs Node.js 18 or newer.

```
cd desktop
npm install
npm start          # opens CALMS in its own window
npm run demo       # same, but always with sample data
npm run dist       # builds the Windows installer into desktop/dist/
```

With no database set up it opens with sample data. To use the real back end,
fill in `backend/.env` (see `backend/README.md`) and run `npm install` in
`backend/` once; the desktop app then starts the back end inside itself. Details
and the settings file are in `desktop/README.md`.

**Installable web app.** Start the back end (`cd backend`, `npm start`) and open
http://localhost:3000 in Chrome or Edge. Click **Install CALMS** at the bottom
left of the sign-in screen (or the install icon in the address bar). CALMS gets
its own window, a Start menu entry and the KUWA icon. To install it on other
computers or phones, the back end must be hosted on the internet with https.

## Before a demo or the defense

Put the database back to the clean demo story (14 applications at every step,
5 older loans with payments). Close CALMS first, then:

```
cd backend
npm run db:reset      # type RESET when asked; takes about a minute
npm start
```

It wipes every application, loan, payment, audit entry and added account, and
keeps the office settings and message templates. Every demo account's password
is `Kuwa-guards-2026`. Do not run `npm test` afterwards: it adds its own test
applications. The demo script document walks through the story role by role.

**Production mode.** The practice code `246810` for the second factor only works
while `NODE_ENV` is not `production`. For real use, add `NODE_ENV=production` to
`backend/.env`; then only the authenticator app's code works, cookies need
https, and `npm run db:reset` refuses to run.

**Windows installer.** `cd desktop`, `npm install`, `npm run dist`. The installer
lands in `desktop/dist/`. Windows shows "Windows protected your PC" because the
installer is not code-signed: click **More info**, then **Run anyway**. On first
start, open the settings folder from the CALMS menu and put the `DATABASE_URL`
line in `calms.env` (never share that file).

## Folders

```
calms/
├── README.md
├── frontend/              the prototype
│   ├── index.html         sign-in screen with the intro
│   ├── pages/             the other 24 screens, one file each
│   └── assets/
│       ├── css/           base.css (shared) + one stylesheet per page
│       ├── js/            one script per page, plus links.js and entrance.js
│       ├── img/           KUWA sprite sheet, logo, train, town/ for the intro, app/ for the app icons
│       └── fonts/         Badhorse, Ovo and Courier Prime
│   ├── manifest.webmanifest   makes CALMS installable as a web app
│   └── sw.js              the service worker: keeps the screens available offline, never stores loan data
├── backend/               the Express API (see backend/README.md)
├── desktop/               the desktop app (Electron); see desktop/README.md
├── design/
│   ├── kuwa/              the script that draws KUWA, the sprite sheet and its frame list
│   ├── icons/             the script that draws the pixel icons
│   ├── app-icon/          the script that draws the app icon
│   └── porch/             the script that draws the porch close-up for the walk into the bank
└── docs/
    ├── ARCHITECTURE.md    the stack, the database, the API and what to build next
    ├── PAGES.md           every screen, its file and who uses it
    └── pages.json         the same list for scripts
```

## How a page is put together

- `assets/css/base.css` holds what most pages share: the font, the colour
  tokens for light and dark, the drawer-cabinet side rail and the plank wall.
- Each page then loads its own stylesheet and its own script.
- Seven older pages (sign-in, review queue, credit assessment, decision,
  counter-offers, record answer, loan agreement) carry their own copy of the
  base styles and do not load `base.css`.
- KUWA is one sprite sheet, `assets/img/kuwa.png`: 96 by 96 pixel frames,
  8 across. `design/kuwa/kuwa.json` lists the frames and animation names.

## How the pages link to each other

`frontend/assets/js/links.js` is the one file that knows which screen leads to
which. Every page loads it after its own script. It does three things:

- gives each drawer in the side rail, and each breadcrumb, a real address;
- makes the name at the foot of the rail open My profile, with a Sign out link;
- when a button would lead to another screen, sends you there. Each page script
  writes a short note saying where the button leads, and `links.js` reads that
  note and the button's label to pick the page.

To change where something goes, edit the two tables at the top of `links.js`.

## The walk into the bank

Signing in plays a short move from the street into the office, in
`assets/js/entrance.js` and `assets/css/entrance.css`:

1. KUWA hops off the sign-in card and the camera zooms from the town toward
   the GR8 Lending building. Partway in, the town dissolves into a close shot
   of the porch (drawn by `design/porch/porch.py`) growing from the same spot.
2. He glides in, flares and lands on the porch rail, shedding feathers and
   kicking up a little dust. He ruffles, turns to the doors and nods. They
   swing inward in five drawn frames onto plain light, and he tips his hat.
3. He flies in first and the camera follows him through the doorway.
4. My Queue appears out of the light, the drawers slide in, and KUWA comes in
   over your shoulder and lands on his perch.

His flying, landing and standing frames for this are a separate sheet,
`assets/img/kuwa-fly.png`, drawn by `design/kuwa/kuwa_fly.py`.

It plays only when you arrive from the sign-in screen. A click or key press
skips it, and with reduced motion turned on there is no walk, only the page
change.

## Closing time (signing out)

Sign out on any page plays the walk backwards, shorter: the drawers shut, KUWA flies off, the light takes over; outside, he lands on the rail, the doors swing shut, the camera pulls back to the town and the sign-in card comes up. A click or any key skips it. It lives in the same two files, `assets/js/entrance.js` and `assets/css/entrance.css`, which every page now loads.

## Icons

The icons are our own pixel set, drawn in the same palette as the rest of the
app by `design/icons/icons.py` (16 by 16 pixels each, 32 icons). There is one
for every screen plus a few marks (ok, warn, stop, clock, lock, search, peso).
They appear in the side-rail drawers, beside each page title and as each
page's browser-tab icon. To use one anywhere:
`<i class="ic ic-lg ic-decision"></i>`.

## KUWA's idle life

`assets/js/kuwa-life.js` (with `assets/css/kuwa-life.css`) runs on every page
except sign-in and keeps KUWA moving when the page has nothing for him to do:

- he breathes, blinks unevenly, glances about and shifts his weight;
- every 8 to 20 seconds he fidgets: hat, bandana, ruffle, preen, head tilt,
  head swivel, foot scratch, wing stretch, yawn, polishing his star;
- he follows the cursor when it is near, leans in while you type, looks where
  you click, perks up when you come back to the tab, and objects to being poked;
- left alone he gets drowsy after 30 seconds and falls asleep after 60, then
  startles awake when you move;
- in character: he taps a foot on pages with overdue items, checks a pocket
  watch where there is a deadline, counts on his feathers where there is money,
  stamps at an approval and squints at a form error.

- his face changes: stern, soft, curious, smug, focused and pleased, with two
  in-between drawings each way so the brows and pupils travel;
- props: he sips from a mug, reads a ledger and puts on spectacles;
- the head leads: when something changes on the page he looks with his eyes,
  then turns his head, then leans toward it. He ducks when a stamp lands near
  him, flinches at the chain on the Loan agreement page and watches the train;
- he gets about: on pages with forms he hops or flies to the top edge of the
  card you are working in, and goes home after 20 seconds or when your cursor
  reaches him. Ignored for about 16 seconds, he peeks from behind the side rail.

A page's own reactions always win: while a page plays one, this script steps
aside. The frames are `assets/img/kuwa-idle.png`, drawn by
`design/kuwa/kuwa_idle.py`. With reduced motion he only breathes and blinks.

## Known gaps

The full list, requirement by requirement, is in the traceability document
(126 of 185 SRS requirements built, 7 simulated, 43 partly built, 9 not built).
The main ones:

- No link to a core banking or accounting system (FR-084).
- No critical-priority flag (BR-016) and no past-due check on new loans (BR-018).
- Above the Lead Underwriter's limit nobody can decide (FR-064, BR-007).
- SMS is not connected; email works through Gmail.
- Screens re-read every 20 seconds to 2 minutes instead of updating within two seconds.
- The FinScore credit bureau is a stand-in that behaves like the real API.
