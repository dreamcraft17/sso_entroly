/**
 * Bulk User Registration Script - Sequential Version
 * Uses a single pg connection for all operations
 */

import 'dotenv/config';
import pg from "pg";
import bcrypt from "bcryptjs";
import fs from "fs";
import crypto from "crypto";

const { Pool } = pg;

// Create a single connection pool
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 1 // Single connection
});

async function main() {
    // Read the access-keys.json file
    const keysPath = "/data/projects/access-keys.json";
    const keysData = JSON.parse(fs.readFileSync(keysPath, "utf-8"));

    const { adminKeys, creatorKeys } = keysData;

    // Combine all keys
    const allUsers = Object.entries({ ...adminKeys, ...creatorKeys });

    console.log(`Found ${allUsers.length} users to register`);
    console.log(`Database: ${process.env.DATABASE_URL ? "configured" : "NOT CONFIGURED!"}\n`);

    let created = 0;
    let skipped = 0;
    let errors = 0;

    const client = await pool.connect();

    try {
        for (const [username, password] of allUsers) {
            try {
                const normalizedUsername = username.toLowerCase().trim();

                // Check if user exists
                const existing = await client.query(
                    'SELECT id FROM "User" WHERE username = $1',
                    [normalizedUsername]
                );

                if (existing.rows.length > 0) {
                    console.log(`⏭️  Skipped: ${username}`);
                    skipped++;
                    continue;
                }

                // Hash password
                const hashedPassword = await bcrypt.hash(password, 12);
                const id = crypto.randomUUID().replace(/-/g, '').slice(0, 25);

                // Insert user
                await client.query(
                    `INSERT INTO "User" (id, username, password, name, "createdAt", "updatedAt") 
                     VALUES ($1, $2, $3, $4, NOW(), NOW())`,
                    [id, normalizedUsername, hashedPassword, username]
                );

                console.log(`✅ Created: ${username}`);
                created++;

            } catch (error) {
                console.error(`❌ Error: ${username} - ${error.message}`);
                errors++;
            }
        }
    } finally {
        client.release();
    }

    console.log(`\n${"=".repeat(50)}`);
    console.log(`Summary:`);
    console.log(`  Created: ${created}`);
    console.log(`  Skipped: ${skipped}`);
    console.log(`  Errors:  ${errors}`);
    console.log(`  Total:   ${allUsers.length}`);

    await pool.end();
}

main().catch(console.error);
