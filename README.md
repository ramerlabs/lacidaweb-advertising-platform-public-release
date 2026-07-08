# Pulse — Multi-tenant Social Media Automation SaaS

Production-ready scaffold for a Zernio-powered social automation platform.

**Stack:** Next.js 15 · TypeScript · Tailwind CSS · Prisma · PostgreSQL · NextAuth · Recharts · `@zernio/node`

## Features

1. **Multi-tenant orgs** — Users, Teams, membership roles, ConnectedAccounts
2. **Zernio OAuth connect** — Hosted connect URL per platform, callback sync
3. **Publisher engine** — Compose, media presign/upload, publish now / schedule / draft, platform-specific options
4. **Unified inbox** — Webhook listener (`comment.received`, `message.received`), manual reply, keyword auto-reply rules
5. **Analytics dashboard** — Aggregated impressions/reach/engagement/followers with Recharts
6. **Audit log** — Publishing state transitions (`draft`, `pending`, `scheduled`, `published`, `failed`)

## Quick start

```bash
cp .env.example .env.local
# fill DATABASE_URL, NEXTAUTH_SECRET, ZERNIO_API_KEY, ZERNIO_WEBHOOK_SECRET, APP_URL

npm install
npx prisma db push
npm run dev
```

Open http://localhost:3000 → register a workspace → connect accounts → compose.

## Environment

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` | Postgres connection string |
| `NEXTAUTH_URL` | App URL for auth |
| `NEXTAUTH_SECRET` | Session encryption secret |
| `ZERNIO_API_KEY` | Zernio API key (`sk_...`) |
| `ZERNIO_WEBHOOK_SECRET` | HMAC secret for `X-Zernio-Signature` |
| `APP_URL` | Public app URL (OAuth callback + redirects) |

## Zernio webhook setup

1. In Zernio, create webhook → URL: `https://YOUR_DOMAIN/api/webhooks/zernio`
2. Events: `comment.received`, `message.received`, `message.sent`, post status events
3. Secret must match `ZERNIO_WEBHOOK_SECRET`

## Deploy to Vercel

1. Push this repo to GitHub
2. Import in Vercel
3. Add env vars above (use Neon/Supabase/Vercel Postgres for `DATABASE_URL`)
4. Deploy
5. Run migrations: `npx prisma db push` (or `prisma migrate deploy`) against production DB
6. Update `APP_URL` / `NEXTAUTH_URL` to the Vercel domain
7. Register the webhook URL in Zernio

## Project structure

```
prisma/schema.prisma          Multi-tenant relational schema
src/lib/zernio.ts             SDK client + rate-limit retry
src/services/
  profiles.ts                 Ensure Zernio profile per team
  accounts.ts                 Connect / sync / disconnect
  publisher.ts                posts.create + media presign
  inbox.ts                    Webhooks + auto-reply
  analytics.ts                Aggregation for charts
src/app/api/                  REST routers
src/app/dashboard/            UI pages (compose, inbox, analytics, …)
```

## Notes

- `@zernio/node` request shapes differ slightly by SDK version; service wrappers accept both flat and `{ body }` styles.
- Large media: use the compose uploader (Zernio presigned URL). Browser uploads are practical for typical assets; for multi-GB files, upload from a backend/worker with the same presign flow.
- Never expose `ZERNIO_API_KEY` to the client.
