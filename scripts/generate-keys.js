/**
 * Script to generate RSA key pair for JWT signing
 * Run with: node scripts/generate-keys.js
 */

const crypto = require("crypto");
const fs = require("fs");
const path = require("path");

// Generate RSA key pair
const { privateKey, publicKey } = crypto.generateKeyPairSync("rsa", {
    modulusLength: 2048,
    publicKeyEncoding: {
        type: "spki",
        format: "pem",
    },
    privateKeyEncoding: {
        type: "pkcs8",
        format: "pem",
    },
});

// Save keys to files
const keysDir = path.join(__dirname, "..", "keys");
if (!fs.existsSync(keysDir)) {
    fs.mkdirSync(keysDir);
}

fs.writeFileSync(path.join(keysDir, "private.pem"), privateKey);
fs.writeFileSync(path.join(keysDir, "public.pem"), publicKey);

console.log("✅ Keys generated successfully!");
console.log("📁 Saved to: keys/private.pem and keys/public.pem");
console.log("");
console.log("For .env file, use these values (newlines replaced with \\n):");
console.log("");
console.log("JWT_PRIVATE_KEY=\"" + privateKey.replace(/\n/g, "\\n") + "\"");
console.log("");
console.log("JWT_PUBLIC_KEY=\"" + publicKey.replace(/\n/g, "\\n") + "\"");
