# TikTok Login Kit for Web – mapping ke kode

Panduan resmi: [Login Kit for Web](https://developers.tiktok.com/doc/login-kit-web/).  
Implementasi kita mengikuti panduan ini.

---

## Prerequisites

| Doc | Kode / config |
|-----|----------------|
| Register app, client key & secret | `TIKTOK_CLIENT_KEY`, `TIKTOK_CLIENT_SECRET` di env |
| Redirect URI: absolute, https, static, no params/fragment, max 10, &lt; 512 chars | Didaftarkan di TikTok Login Kit; kita pakai `getTiktokRedirectUri()` → harus **exact match** |

---

## Front-end

| Doc | Kode |
|-----|------|
| Link ke server OAuth endpoint | Tombol "Login with TikTok" → `href` ke `/api/auth/tiktok/login` (dengan `?redirect=...` jika ada) |

File: `src/app/login/page.tsx`.

---

## Server – tanggung jawab

| Doc | Kode |
|-----|------|
| Client secret & refresh token disimpan aman | Hanya di server (env + DB); tidak ke frontend |
| Lindungi dari request forgery | State token: simpan di cookie, cocokkan di callback |
| Handle refresh flow sebelum token kadaluarsa | Refresh token disimpan di `Account`; bisa ditambah job refresh |
| Kelola alur access token per user | Token exchange di callback; simpan di `Account` + set SSO cookies |

---

## Redirect ke TikTok

| Doc | Kode |
|-----|------|
| Buat anti-forgery state token (unique, random) | `randomBytes(32).toString("base64url")`; simpan di cookie `tiktok_oauth_state` (60s) |
| URL authorize | `https://www.tiktok.com/v2/auth/authorize/` |
| Query params (application/x-www-form-urlencoded) | `URLSearchParams`: `client_key`, `response_type=code`, `scope`, `redirect_uri`, `state`, `disable_auto_auth` |

File: `src/app/api/auth/tiktok/login/route.ts`.

---

## Authorization response (callback)

| Doc | Kode |
|-----|------|
| Redirect ke `redirect_uri` dengan: `code`, `scopes`, `state`, atau `error` + `error_description` | Baca dari `request.nextUrl.searchParams` |
| Cek state dari response = state yang dikirim | Bandingkan cookie `tiktok_oauth_state` dengan query `state`; kalau beda → redirect ke `/login?error=Invalid+state` |
| Handle error dengan graceful | Redirect ke `/login?error=...` (pakai `error_description` jika ada); log untuk debug |

File: `src/lib/tiktok-callback-handler.ts`, dipakai oleh `/api/auth/tiktok/callback` dan `/auth/tiktok/callback`.

---

## Manage access token

| Doc | Kode |
|-----|------|
| Pakai `code` dari callback untuk dapat `access_token` | POST ke `https://open.tiktokapis.com/v2/oauth/token/` dengan `client_key`, `client_secret`, `code`, `grant_type=authorization_code`, `redirect_uri` (sama persis dengan saat minta code) |
| Simpan & pakai untuk login user | Buat/update user & Account di DB; generate JWT SSO; set cookie `sso_access_token` / `sso_refresh_token` |

File: `src/lib/tiktok-callback-handler.ts`, `src/lib/tiktok-redirect-uri.ts`.
