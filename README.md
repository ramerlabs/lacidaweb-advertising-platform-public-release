# lacidaweb Advertising Platform

![lacidaweb](public/branding/og.png)

**Self-serve advertising SaaS** from [RamerLabs](https://ramerlabs.com) — advertisers launch campaigns, publishers monetize sites with embed code, and the platform pays out on valid CPM/CPC.

| | |
| --- | --- |
| **Product page** | [ramerlabs.com/product/lacidaweb-advertising-platform](https://ramerlabs.com/product/lacidaweb-advertising-platform/) |
| **Support** | [support@ramerlabs.com](mailto:support@ramerlabs.com) |
| **License** | Requires a RamerLabs license key (purchase on the product page) |

**Stack:** Next.js 15 · TypeScript · Tailwind CSS · Prisma · PostgreSQL · NextAuth

---

## What you get

1. **Advertiser campaigns** — Guided wizard (objective → audience → budget → creative), with optional AI creatives from a saved business profile
2. **Prepaid wallet billing** — Top up with USDT, GCash, PayPal, or US Bank (min. $25); no subscription required; **no KYC**
3. **Campaign budget reserve** — Wallet balance is reserved on submit and refunded if admin rejects the ad
4. **AI tokens** — Optional packs (buy with wallet or other methods); advertiser overview shows a token usage bar
5. **Transaction logs** — Advertiser wallet + publisher earnings ledgers (auto-purged after 7 days)
6. **Publisher network** — Manual embeds + automatic ad placement; CPM/CPC payouts (USDT, PayPal, GCash, US Bank)
7. **Ad serving** — Rotate ads, fraud filtering, impression/click tracking, house-ad fallback
8. **Admin ops** — Campaign review (approve / reject / pause / delete), payments, payouts, branding, AI & ads settings
9. **Licensing** — Platform stays locked until you activate a RamerLabs license key

---

## Requirements

- Node.js **20+** (LTS recommended)
- A **PostgreSQL** database (e.g. [Neon](https://console.neon.tech))
- A RamerLabs **license key** for `lacidaweb-advertising-platform`
- Optional: Vercel (or any Node host) for production

---

## Installation (local)

### 1. Clone and install

```bash
git clone https://github.com/ramerlabs/lacidaweb-advertising-platform-public-release.git
cd lacidaweb-advertising-platform-public-release
npm install
```

### 2. Configure environment

```bash
cp .env.example .env.local
```

Edit `.env.local` and set at least:

| Variable | Required | Description |
| --- | --- | --- |
| `DATABASE_URL` | Yes | Postgres connection string |
| `NEXTAUTH_SECRET` | Yes | Long random secret (e.g. `openssl rand -base64 32`) |
| `NEXTAUTH_URL` | Yes | App URL, e.g. `http://localhost:3000` |
| `APP_URL` | Yes | Same public URL as above |
| `ADMIN_EMAILS` | Yes | Comma-separated admin usernames/emails (include `admin`) |

Optional: Google OAuth, SMTP, Telegram, payment instruction text — see `.env.example`.

### 3. Create the database schema

```bash
npx prisma db push
```

### 4. Create the default admin account

```bash
npm run db:seed:admin
```

Defaults (change after first login):

- **Username:** `admin`
- **Password:** `admin123`

Or full bootstrap (schema + branding + FAQs + admin):

```bash
npm run db:setup:lacidaweb
```

### 5. Start the app

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### 6. Activate your license

Until a license is active, dashboards, registration, and ad serving stay locked.

1. Go to [http://localhost:3000/login/admin](http://localhost:3000/login/admin)
2. Sign in with `admin` / `admin123`
3. Open **Admin → License**
4. Paste your license key and activate

You can also set `LACIDAWEB_LICENSE_KEY` in `.env.local` and validate from the License page.

**Need a key?** Buy at the [product page](https://ramerlabs.com/product/lacidaweb-advertising-platform/) or email [support@ramerlabs.com](mailto:support@ramerlabs.com).

---

## Deploy to production (Vercel)

1. Fork or import this repository into [Vercel](https://vercel.com)
2. Create a production Postgres database and copy `DATABASE_URL`
3. In Vercel → Project → Settings → Environment Variables, add:

   - `DATABASE_URL`
   - `NEXTAUTH_SECRET`
   - `NEXTAUTH_URL` = `https://your-domain.com`
   - `APP_URL` = `https://your-domain.com`
   - `ADMIN_EMAILS` = `admin` (and any other admin emails)
   - Optional: `LACIDAWEB_LICENSE_KEY`, OAuth, SMTP, Telegram

4. Deploy
5. Against the **production** database, run once (from your machine with `DATABASE_URL` set to production):

   ```bash
   npx prisma db push
   npm run db:seed:admin
   ```

6. Visit `https://your-domain.com/login/admin`, sign in, activate the license
7. Change the default admin password under **Admin → Security** (or create a new admin and remove the default)

### Publisher embeds

After licensing, publishers get embed snippets that call your public `APP_URL` (e.g. `/api/ads/serve`). Use your production domain in embeds — not `localhost`.

---

## First-time checklist

- [ ] Database connected (`prisma db push` succeeded)
- [ ] Admin user created (`npm run db:seed:admin`)
- [ ] `ADMIN_EMAILS` includes `admin` (or your admin email)
- [ ] License activated in **Admin → License**
- [ ] Default password changed
- [ ] `APP_URL` / `NEXTAUTH_URL` match your live domain
- [ ] Payment methods configured under **Admin → Payment gateways**
- [ ] Publisher CPM/CPC rates set under **Admin → Publisher ads**
- [ ] (Optional) AI token pack pricing under **Admin → AI & tokens**

---

## Support

If you get stuck installing, deploying, or activating a license:

- **Email:** [support@ramerlabs.com](mailto:support@ramerlabs.com)
- **Company:** [ramerlabs.com](https://ramerlabs.com)
- Include your domain, error message, and whether this is local or Vercel

We do **not** publish the license server URL in the app UI — only the license key is required.

---

## Project structure (high level)

```
prisma/schema.prisma          Database schema
src/app/                      Next.js App Router (admin, dashboard, APIs)
src/services/                 Ad serving, wallet ledger, campaigns, payouts
src/lib/license.ts            License activation / validation
public/embed.js               Publisher embed + auto ads
public/uploads/               Local media uploads
```

---

## License & commercial use

This software is distributed for use with a valid **RamerLabs** license for the product slug `lacidaweb-advertising-platform`. Unauthorized use without an active license is not permitted.

Questions about licensing, renewals, or custom deployments: [support@ramerlabs.com](mailto:support@ramerlabs.com).
