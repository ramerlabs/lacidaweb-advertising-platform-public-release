# lacidaweb — Advertising Platform

![lacidaweb](public/branding/og.png)

Self-serve advertising SaaS for [lacidaweb.com](https://lacidaweb.com) — advertisers launch campaigns, publishers monetize sites with embed code, and the platform pays out on valid CPM/CPC.

**Stack:** Next.js 15 · TypeScript · Tailwind CSS · Prisma · PostgreSQL · NextAuth · Recharts

## Features

1. **Advertiser campaigns** — Guided wizard (objective → audience → budget → creative types)
2. **Publisher network** — Manual embeds + automatic ad placement (Google Auto ads style)
3. **Ad serving** — Rotate all ads, fraud filtering, impression/click tracking
4. **Publisher payouts** — CPM/CPC earnings with payout requests via USDT, PayPal, GCash, US Bank
5. **Admin ops** — Campaign review, payments, publisher payouts, branding, integrations
6. **RamerLabs licensing** — Activate a license key to unlock this deployment

## Quick start

```bash
cp .env.example .env.local
# fill DATABASE_URL, NEXTAUTH_SECRET, APP_URL, ADMIN_EMAILS

npm install
npx prisma db push
npm run dev
```

Open http://localhost:3000

## Environment

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` | Postgres connection string (dedicated lacidaweb Neon project) |
| `NEXTAUTH_URL` | App URL for auth |
| `NEXTAUTH_SECRET` | Session encryption secret |
| `APP_URL` | Public app URL |
| `ADMIN_EMAILS` | Comma-separated platform admin emails |
| `LACIDAWEB_LICENSE_KEY` | Optional: pre-set license key (or activate in Admin → License) |
| `RLM_PRODUCT_SLUG` | License product slug (`lacidaweb-advertising-platform`) |

## Deploy to Vercel

1. Push to GitHub (`ramerlabs/lacidaweb.com-advertising-platform`)
2. Import in Vercel / auto-deploy from `main`
3. Add env vars (use Neon Postgres for `DATABASE_URL`)
4. Run `npx prisma db push` against production DB once
5. Set `APP_URL` / `NEXTAUTH_URL` to your domain
6. Activate license in **Admin → License**

## Project structure

```
prisma/schema.prisma          lacidaweb advertising domain
src/services/
  ad-serving.ts               Serve + rotate ads
  publisher-earnings.ts       Fraud filter + credit CPM/CPC
  publisher-payouts.ts        Payout requests / admin review
  campaigns.ts                Advertiser campaign lifecycle
src/lib/license.ts            RamerLabs license client
public/embed.js               Publisher embed + auto ads
```
