# Lactiq coming-soon site

Next.js (App Router), Tailwind v4, TypeScript. One static page, a build-log stub, a privacy page, and two API routes (waiting list, unsubscribe). Only runtime dependencies: `next`, `react`, `react-dom`. Resend and the Google Sheet are called with `fetch`.

```bash
cd lactiq
cp .env.example .env.local   # fill in values
npm install
npm run dev                  # http://localhost:3000
```

With no env vars set, `npm run dev` logs emails and sheet rows to the console instead of sending them. Production fails closed (500) if they are missing.

## Waiting list setup

1. **Resend**: verify `lactiq.co.uk`, create an API key, set `RESEND_API_KEY` and `RESEND_FROM`.
2. **Google Sheet**: create a sheet with headers `timestamp, email, buildLog`. Extensions → Apps Script, paste:

   ```js
   function doPost(e) {
     var d = JSON.parse(e.postData.contents);
     var secret = PropertiesService.getScriptProperties().getProperty("SECRET");
     if (d.secret !== secret) return ContentService.createTextOutput("forbidden");
     var sh = SpreadsheetApp.getActiveSpreadsheet().getSheets()[0];
     if (d.action === "unsubscribe") {
       var rows = sh.getDataRange().getValues();
       for (var i = rows.length - 1; i > 0; i--) if (String(rows[i][1]).toLowerCase() === d.email) sh.deleteRow(i + 1);
     } else {
       sh.appendRow([d.timestamp, d.email, d.buildLog]);
     }
     return ContentService.createTextOutput("ok");
   }
   ```

   Project settings → Script properties → add `SECRET`. Deploy → Web app (execute as you, access: anyone). Put the URL in `SHEET_WEBHOOK_URL` and the secret in `SHEET_WEBHOOK_SECRET`.
3. `UNSUBSCRIBE_SECRET`: `openssl rand -hex 32`.

Unsubscribe links in confirmation emails open `/unsubscribe`, which asks for one click and then removes the row.

Rate limiting is in memory per serverless instance (5 signups per IP per 10 minutes) plus a honeypot field. Swap in Vercel KV or Upstash if you see abuse.

## Deploy

1. Push this repo to GitHub. In Vercel: **Add New Project**, import it, set **Root Directory** to `lactiq`.
2. Add the env vars from `.env.example` (Production and Preview).
3. Or from the CLI: `cd lactiq && vercel` (preview), `vercel --prod` (production).
4. **Domains**: add `lactiq.co.uk` as primary. Add `lactiq.uk`, `lactiq.run` and `www` variants to the same project; `next.config.ts` 301s them to `https://lactiq.co.uk`.
5. Optional: set `NEXT_PUBLIC_PLAUSIBLE_DOMAIN`, `NEXT_PUBLIC_INSTAGRAM_URL`, `NEXT_PUBLIC_YOUTUBE_URL`. The JSON-LD `sameAs` only lists social URLs you set.

## To fill in before launch

- Footer: replace `[Company] Ltd` in `app/layout.tsx`.
- Social URLs (footer links fall back to the platform homepages until set).
- Build-log post dates in `app/page.tsx` are month placeholders.
