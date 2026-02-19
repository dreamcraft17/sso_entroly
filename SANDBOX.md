# Test via TikTok Sandbox

[TikTok Sandbox](https://developers.tiktok.com/doc/add-a-sandbox/) dipakai untuk uji Login Kit tanpa submit app untuk review.

**Penting:**
- **Credentials sandbox** bisa **berbeda** dari production. Pakai **Client key** dan **Client secret** dari halaman sandbox (App details → Credentials), bukan dari production.
- **localhost tidak didukung** untuk Redirect URI di TikTok. Hapus `http://localhost:4012/...` dari Login Kit; pakai URL publik (mis. **ngrok** atau **https://sandbox.sso.entro.ly**).

---

## 0. Test API di sandbox (ringkasan)

1. **Set env sandbox** (lihat §2) → `NEXT_PUBLIC_SSO_URL` = URL tempat kamu test (mis. `http://localhost:4012`).
2. **Jalankan app:** `npm run dev` (atau port 4012: `npm run dev -- -p 4012`).
3. **Daftarkan Redirect URI** di TikTok Sandbox (lihat §1) persis: `{NEXT_PUBLIC_SSO_URL}/api/auth/tiktok/callback`.
4. **Tambahkan Target user** di Sandbox → pakai akun TikTok itu untuk test Login with TikTok.
5. **Cek API** (bisa pakai browser atau curl):

| Endpoint | Method | Cara test |
|----------|--------|-----------|
| `/api/auth/me` | GET | Setelah login (cookie), buka `{BASE}/api/auth/me` dengan credentials; harus return `user`. |
| `/api/auth/login` | POST | `POST` body JSON `{ "identifier": "email atau username", "password": "..." }`. |
| `/api/auth/tiktok/login` | GET | Buka di browser → redirect ke TikTok; setelah authorize, kembali ke callback lalu redirect ke `redirect`. |
| `/api/auth/tiktok/callback` | GET | Dipanggil TikTok (jangan manual); cek log server kalau error. |
| `/api/auth/logout` | POST | Setelah login, POST form ke `/api/auth/logout`; cookie cleared. |

**Base URL sandbox:** ganti `{BASE}` dengan `http://localhost:4012` atau URL staging kamu.

**Contoh cek session (setelah login di browser):**

```bash
curl -v "http://localhost:4012/api/auth/me" -H "Cookie: sso_access_token=..."
```

(Opsi: login dulu di browser, copy cookie `sso_access_token` dari DevTools → Application → Cookies.)

**Contoh test login (email):**

```bash
curl -X POST "http://localhost:4012/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"identifier":"user@example.com","password":"yourpassword"}' \
  -c cookies.txt -v
```

Kalau sukses, response JSON + Set-Cookie; lanjut cek `/api/auth/me` dengan cookie dari `cookies.txt` atau browser.

---

## 1. Di TikTok Developer Portal

1. Buka [developers.tiktok.com](https://developers.tiktok.com) → pilih app kamu.
2. **Switch ke Sandbox:** geser toggle di samping nama app ke **Sandbox**.
3. **Buat sandbox (kalau belum):** klik **Create Sandbox**, isi nama, bisa clone dari production.
4. **Credentials sandbox:** di **App details → Credentials** catat **Client key** dan **Client secret** sandbox (bisa beda dari production). Pakai nilai ini di `.env` saat test sandbox.
5. **Konfigurasi sandbox:**
   - **Products** → pastikan **Login Kit** aktif.
   - **Login Kit** → **Redirect URI (Web):**
     - **Jangan pakai localhost** – TikTok menolak: "localhost is not supported". Hapus URI localhost jika ada.
     - Tambahkan **hanya** URI publik, misalnya:
       - `https://sandbox.sso.entro.ly/api/auth/tiktok/callback` (staging kamu), atau
       - URL dari **ngrok** (mis. `https://abc123.ngrok.io/api/auth/tiktok/callback`) kalau test lokal via tunnel.
6. **Target users:** di Sandbox settings, **Add account** → login pakai TikTok account yang mau dipakai test (maks 10).
7. Klik **Apply changes**.

---

## 2. Env di app (untuk test sandbox)

- **TIKTOK_CLIENT_KEY** dan **TIKTOK_CLIENT_SECRET** harus dari **Credentials sandbox** (bukan production), supaya tidak dapat error "correct client_key" dari TikTok.
- **NEXT_PUBLIC_SSO_URL** = base URL tempat app jalan (harus **HTTPS** dan **bukan localhost**; atau pakai URL ngrok).

**Contoh – test di staging (sandbox.sso.entro.ly):**

```env
NEXT_PUBLIC_SSO_URL="https://sandbox.sso.entro.ly"
TIKTOK_CLIENT_KEY="<Client key dari sandbox Credentials>"
TIKTOK_CLIENT_SECRET="<Client secret dari sandbox Credentials>"
# Jangan set TIKTOK_REDIRECT_URI
```

Redirect URI yang dipakai: `https://sandbox.sso.entro.ly/api/auth/tiktok/callback` → daftarkan di Login Kit (Web) sandbox.

**Contoh – test lokal pakai ngrok:**

1. Jalankan app: `npm run dev` (port 3000) atau `npm run dev:sandbox` (4012).
2. Jalankan ngrok: `ngrok http 4012` (atau 3000).
3. Di TikTok Login Kit (sandbox) daftarkan: `https://<hash>.ngrok.io/api/auth/tiktok/callback`.
4. Di `.env`: `NEXT_PUBLIC_SSO_URL="https://<hash>.ngrok.io"`, plus **sandbox** client key/secret.

---

## 3. Cara test

1. Pastikan app jalan (mis. `npm run dev` di port 4012).
2. Buka `http://localhost:4012/login` (atau URL staging).
3. Klik **Login with TikTok**.
4. Login pakai **TikTok account yang sudah ditambahkan sebagai Target user** di sandbox.
5. Setelah authorize, kamu harus di-redirect kembali ke app dan sudah login.

Kalau dapat error "TikTok login failed", cek:
- Redirect URI di sandbox = persis dengan `NEXT_PUBLIC_SSO_URL` + `/api/auth/tiktok/callback`.
- Akun TikTok yang dipakai sudah ditambahkan di Sandbox → Target users.
- Lihat log server (console.error callback) untuk `error` / `error_description` dari TikTok.

---

## 4. Dari sandbox ke production

Saat siap production, di TikTok:
- Geser toggle kembali ke **Production**.
- Pastikan Redirect URI production (mis. `https://sso.entro.ly/api/auth/tiktok/callback`) sudah ada di Login Kit (Production).
- Bisa [import konfigurasi sandbox ke Draft](https://developers.tiktok.com/doc/add-a-sandbox/#import-your-sandbox-configuration) kalau mau pakai config yang sama.
