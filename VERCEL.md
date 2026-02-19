# Deploy SSO ke Vercel

Setelah deploy, dapat URL HTTPS (mis. `https://sso-entroly.vercel.app`) → bisa dipakai untuk test TikTok Login tanpa ngrok/localhost.

---

## 1. Persiapan

- Repo di GitHub (push dulu kalau belum).
- Database PostgreSQL (Vercel tidak menyediakan DB; pakai Neon, Supabase, atau PostgreSQL lain).
- JWT key pair (private + public) dan TikTok credentials.

---

## 2. Deploy di Vercel

1. Buka [vercel.com](https://vercel.com) → **Add New** → **Project**.
2. **Import** repo GitHub kamu (pilih repo `entroly_sso` atau nama repo-nya).
3. **Framework Preset:** Next.js (terdeteksi otomatis).
4. **Build & Output:**
   - **Build Command:** `npm run vercel-build` (supaya Prisma generate + next build; jangan pakai `next build && pm2 restart`). Script ini memakai `DISABLE_ERD=true` agar generator ERD (yang butuh Puppeteer/Chrome) tidak dijalankan di Vercel.
   - **Output Directory:** (kosongkan, default Next.js).
   - **Install Command:** `npm install` (default).
5. **Root Directory:** (kosongkan kalau repo root = project).
6. Klik **Deploy** (bisa gagal dulu kalau env belum lengkap).

---

## 3. Environment Variables (Vercel Dashboard)

Di project → **Settings** → **Environment Variables**, tambahkan:

| Name | Value | Environment |
|------|--------|-------------|
| `DATABASE_URL` | `postgresql://user:pass@host:5432/db?sslmode=require` | Production, Preview |
| `JWT_PRIVATE_KEY` | Isi private key (satu baris, `\n` untuk newline) | Production, Preview |
| `JWT_PUBLIC_KEY` | Isi public key (satu baris, `\n` untuk newline) | Production, Preview |
| `NEXT_PUBLIC_SSO_URL` | **URL Vercel kamu** (lihat langkah 4) | Production, Preview |
| `TIKTOK_CLIENT_KEY` | Client key (sandbox atau production) | Production, Preview |
| `TIKTOK_CLIENT_SECRET` | Client secret (sandbox atau production) | Production, Preview |

**Jangan** set `TIKTOK_REDIRECT_URI`; pakai `NEXT_PUBLIC_SSO_URL` saja.

Setelah ubah env, **Redeploy** (Deployments → ⋮ → Redeploy).

---

## 4. NEXT_PUBLIC_SSO_URL dan TikTok Redirect URI

- Setelah deploy pertama, Vercel kasih URL seperti:  
  `https://sso-entroly-xxx.vercel.app`  
  (atau custom domain kalau sudah di-set).
- Set **NEXT_PUBLIC_SSO_URL** di Vercel = URL itu (tanpa trailing slash), misalnya:  
  `https://sso-entroly-xxx.vercel.app`
- Di **TikTok Developer Portal** (Login Kit → Redirect URI Web) tambahkan **persis**:  
  `https://sso-entroly-xxx.vercel.app/api/auth/tiktok/callback`  
  (ganti dengan URL Vercel kamu).
- **Redeploy** lagi setelah ubah `NEXT_PUBLIC_SSO_URL` supaya build pakai nilai baru.

Kalau pakai **custom domain** (mis. `https://sso.entro.ly`):
- Set **NEXT_PUBLIC_SSO_URL** = `https://sso.entro.ly`.
- Di TikTok daftarkan: `https://sso.entro.ly/api/auth/tiktok/callback`.

---

## 5. Database & Prisma

- **DATABASE_URL** harus bisa diakses dari internet (Vercel serverless di cloud).  
  Kalau pakai Neon/Supabase/Railway, dapat connection string dengan `?sslmode=require` (atau opsi SSL yang disarankan).
- Migrasi: jalankan **sekali** dari laptop/server yang bisa akses DB:
  ```bash
  npx prisma migrate deploy
  ```
  (atau set `DATABASE_URL` di lokal sama dengan production, lalu jalankan perintah itu.)

---

## 6. Cek setelah deploy

- Buka `https://<app-kamu>.vercel.app` → harus redirect ke `/login` kalau belum login.
- Login email/password → harus bisa.
- **Login with TikTok** → redirect ke TikTok → kembali ke app dan sudah login (asalkan Redirect URI dan env sudah benar).

---

## Ringkas

| Langkah | Yang dilakukan |
|--------|-----------------|
| 1 | Import repo ke Vercel, Build Command = `npm run vercel-build` |
| 2 | Set env: DATABASE_URL, JWT_*, NEXT_PUBLIC_SSO_URL, TIKTOK_* |
| 3 | NEXT_PUBLIC_SSO_URL = URL Vercel (atau custom domain) |
| 4 | TikTok Login Kit → Redirect URI = `{NEXT_PUBLIC_SSO_URL}/api/auth/tiktok/callback` |
| 5 | Redeploy setelah ubah env; jalankan migrasi DB sekali |

Dengan ini SSO jalan di Vercel dan TikTok Login bisa ditest tanpa ngrok/localhost.
