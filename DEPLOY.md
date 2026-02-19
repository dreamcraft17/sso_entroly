# Deploy ke Production (sso.entro.ly)

## 1. Environment variables (set di server / hosting)

Set variabel berikut di production. **Jangan** commit `.env` atau `.env.production`.

| Variable | Contoh (production) | Wajib |
|----------|---------------------|--------|
| `NODE_ENV` | `production` | ✅ |
| `DATABASE_URL` | `postgresql://user:pass@host:5432/entropi_sso` | ✅ |
| `JWT_PRIVATE_KEY` | Isi private key (satu baris, `\n` untuk newline) | ✅ |
| `JWT_PUBLIC_KEY` | Isi public key (satu baris, `\n` untuk newline) | ✅ |
| `NEXT_PUBLIC_SSO_URL` | `https://sso.entro.ly` | ✅ |
| `TIKTOK_CLIENT_KEY` | Client key dari TikTok Developer Portal | ✅ |
| `TIKTOK_CLIENT_SECRET` | Client secret dari TikTok Developer Portal | ✅ |

**TikTok:** Jangan set `TIKTOK_REDIRECT_URI` di prod; pakai `NEXT_PUBLIC_SSO_URL` saja.  
Redirect URI yang dipakai: `https://sso.entro.ly/api/auth/tiktok/callback`  
Pastikan URI itu **persis** terdaftar di TikTok Login Kit → Redirect URI (Web).

## 2. Database

- Jalankan migrasi: `npx prisma migrate deploy`
- (Opsional) generate client: `npx prisma generate` (biasanya sudah jalan saat build)

## 3. Build & start

```bash
npm ci
npx prisma generate
npx prisma migrate deploy
npm run build
npm start
```

Kalau pakai PM2 (sesuai script di package.json):

```bash
pm2 start npm --name sso -- start
# atau setelah build: pm2 restart sso
```

## 4. Cek setelah deploy

- [ ] https://sso.entro.ly → redirect ke `/login` kalau belum login
- [ ] Login email/password berhasil
- [ ] Login with TikTok → redirect ke TikTok → kembali ke sso.entro.ly dan sudah login
- [ ] Cookie domain: production pakai `.entro.ly` (lihat `src/lib/cookies.ts`)

## 5. Keamanan

- File `.env*` tidak di-commit (sudah di `.gitignore`)
- JWT private key hanya di server, tidak di frontend
- TikTok client secret hanya di server
