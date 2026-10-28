# Pulse

Live Q&A and emoji reactions for meetings, built on a PocketBase backend on Hostinger web hosting (staging preview, WHE-3).

- The host signs up, opens a room and puts `/#/screen/<CODE>` on the big screen.
- The audience scans the QR code (`/#/r/<CODE>`) to ask questions, upvote and send reactions, with no login.
- Every screen updates live through PocketBase realtime. API rules enforce moderation, closed rooms and one vote per person.

The frontend is a static Vite + React + shadcn/ui build that talks to PocketBase same-origin (`/api`).

## Scripts

| Script | What it does |
| --- | --- |
| `scripts/setup-schema.mjs` | Creates or updates the collections and API rules (needs `.pb-superuser.json`) |
| `scripts/seed-demo.mjs` | Seeds the `PULSE` demo room |
| `scripts/e2e.mjs` | 26 end-to-end checks of rules and realtime against the live site (`HTTP2=0` reproduces the HTTP/1.1 realtime hang) |
| `scripts/hide-probe.mjs` | Shows that PocketBase drops update events a subscriber can no longer view |
| `scripts/shoot.mjs` | Headless Chrome screenshots over CDP |

`npm run build` writes `dist/`. The `site` branch holds that build for the Git deploy.
