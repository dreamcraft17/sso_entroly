/**
 * Copy DATABASE_URL from Entroly project ke .env.local SSO.
 * Supaya SSO (lokal atau Vercel) bisa pakai database production yang sama dengan Entroly.
 *
 * Jalankan dari folder sso: node scripts/use-entroly-db.js
 *
 * Entroly path: E:\Entropi\entrop\Entroly (bisa override pakai env ENTROLY_DIR)
 */

const fs = require("fs");
const path = require("path");

const ENTROLY_DIR = process.env.ENTROLY_DIR || "E:\\Entropi\\entrop\\Entroly";
const SSO_DIR = path.resolve(__dirname, "..");

function readEnvFile(dir, filename) {
  const filePath = path.join(dir, filename);
  if (!fs.existsSync(filePath)) return null;
  return fs.readFileSync(filePath, "utf8");
}

function getDatabaseUrl(content) {
  if (!content) return null;
  // Baris DATABASE_URL=... (abaikan yang diawali #)
  const lines = content.split("\n");
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith("#") || !trimmed.startsWith("DATABASE_URL")) continue;
    const match = trimmed.match(/^DATABASE_URL\s*=\s*(.+)$/);
    if (match) {
      const val = match[1].trim().replace(/^["']|["']$/g, "").replace(/#.*$/, "").trim();
      if (val.length > 0) return val;
    }
  }
  return null;
}

function listEnvFiles(dir) {
  try {
    const names = fs.readdirSync(dir);
    return names.filter((n) => n.startsWith(".env"));
  } catch {
    return [];
  }
}

// Sumber DATABASE_URL: 1) env DATABASE_URL, 2) file .env* di folder Entroly
let databaseUrl = (process.env.DATABASE_URL || "").trim().replace(/^["']|["']$/g, "");
if (!databaseUrl) {
  const envFileNames = [".env.local", ".env", ".env.production", ".env.development"];
  for (const name of envFileNames) {
    const content = readEnvFile(ENTROLY_DIR, name);
    databaseUrl = getDatabaseUrl(content);
    if (databaseUrl) break;
  }
}

if (!databaseUrl) {
  const found = listEnvFiles(ENTROLY_DIR);
  console.error("❌ DATABASE_URL tidak ditemukan.");
  console.error("   Entroly tidak punya file .env – set DATABASE_URL langsung:");
  console.error("");
  console.error("   CMD:");
  console.error('   set DATABASE_URL=postgresql://user:password@host:5432/database?sslmode=require');
  console.error("   npm run db:entroly");
  console.error("");
  console.error("   PowerShell:");
  console.error('   $env:DATABASE_URL="postgresql://user:password@host:5432/database?sslmode=require"');
  console.error("   npm run db:entroly");
  console.error("");
  console.error("   Ganti user, password, host, database dengan nilai production DB kamu (Neon/Supabase/dll).");
  process.exit(1);
}

// Baca .env.local SSO (kalau ada)
const ssoEnvPath = path.join(SSO_DIR, ".env.local");
let ssoContent = "";
if (fs.existsSync(ssoEnvPath)) {
  ssoContent = fs.readFileSync(ssoEnvPath, "utf8");
}

// Update atau tambah DATABASE_URL
const newLine = `DATABASE_URL=${databaseUrl.includes(" ") ? `"${databaseUrl}"` : databaseUrl}`;
if (ssoContent.match(/^\s*DATABASE_URL\s*=/m)) {
  ssoContent = ssoContent.replace(/^\s*DATABASE_URL\s*=.*$/m, newLine);
} else {
  ssoContent = (ssoContent.trim() ? ssoContent + "\n\n" : "") + "# Database production (dari Entroly)\n" + newLine + "\n";
}

fs.writeFileSync(ssoEnvPath, ssoContent, "utf8");
console.log("✅ DATABASE_URL sudah disalin ke sso/.env.local");
console.log("   File:", ssoEnvPath);
console.log("");
console.log("   Untuk Vercel: copy nilai DATABASE_URL dari .env.local ke Environment Variables di Vercel.");
