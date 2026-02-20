# Koneksi Database SSO (sama dengan Entroly)

SSO memakai **database production yang sama** dengan project Entroly (`E:\Entropi\entrop\Entroly`).

---

## Lokal (development)

**Cara 1 – Langsung set DATABASE_URL (tanpa file .env di Entroly):**

Dari folder **sso**:

- **CMD:**
  ```bash
  set DATABASE_URL=postgresql://user:password@host:5432/database?sslmode=require
  npm run db:entroly
  ```
- **PowerShell:**
  ```bash
  $env:DATABASE_URL="postgresql://user:password@host:5432/database?sslmode=require"
  npm run db:entroly
  ```

Ganti `user`, `password`, `host`, `database` dengan nilai production DB kamu (dari Neon, Supabase, atau tempat Entroly production jalan).

**Cara 2 – Ambil dari folder Entroly (kalau ada .env di sana):**

1. Pastikan di folder **Entroly** ada file `.env` atau `.env.local` yang berisi `DATABASE_URL`.
2. Dari folder **sso**: `npm run db:entroly`
3. Kalau path Entroly beda: `set ENTROLY_DIR=D:\path\to\Entroly` lalu `npm run db:entroly`.

**Setelah DATABASE_URL ada di sso/.env.local:**

4. Jalankan migrasi sekali (jika belum):
   ```bash
   npx prisma migrate deploy
   ```

---

## Vercel (production)

1. Jalankan dulu sekali di lokal: `npm run db:entroly` (supaya ada nilai `DATABASE_URL` di `.env.local`).

2. Buka `.env.local` di folder sso, copy nilai **DATABASE_URL** (satu baris penuh).

3. Di **Vercel** → Project → **Settings** → **Environment Variables**:
   - **Key:** `DATABASE_URL`
   - **Value:** paste connection string yang tadi (sama dengan Entroly production).
   - **Environments:** Production + Preview.
   - **Sensitive:** nyalakan.

4. **Redeploy** supaya env baru dipakai.

Dengan ini SSO di Vercel akan memakai database production yang sama dengan Entroly.
