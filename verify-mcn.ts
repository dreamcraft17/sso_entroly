
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "./src/generated/prisma";
import * as fs from "fs";

async function verifyMCNConsistency() {
    // Initialize Prisma
    const adapter = new PrismaPg({
        connectionString: process.env.DATABASE_URL || "postgresql://postgres:postgres@localhost:5432/entroly"
    });
    const prisma = new PrismaClient({ adapter });

    console.log("Loading CSV...");
    const csvPath = "/data/projects/Creators Contact - MCN.csv";
    const csvContent = fs.readFileSync(csvPath, "utf-8");
    const lines = csvContent.split("\n").filter(line => line.trim());
    const dataLines = lines.slice(1);

    console.log(`CSV loaded. Found ${dataLines.length} rows.`);

    let validRows = 0;
    let missingPhone = 0;

    // Stats for DB verification
    let notInDb = 0;
    let phoneMismatch = 0;
    let mcnFlagMismatch = 0;
    let consistent = 0;

    console.log("\n--- Checking Database Consistency ---");

    for (const line of dataLines) {
        const columns = line.split(",");
        const username = columns[0]?.trim();
        const phone = columns[1]?.trim();

        if (!username) continue;

        if (!phone) {
            missingPhone++;
            continue;
        }

        validRows++;

        // Expected formatting
        let expectedPhone = phone;
        if (phone.startsWith("0")) {
            expectedPhone = "62" + phone.slice(1);
        } else if (!phone.startsWith("62")) {
            expectedPhone = "62" + phone;
        }

        const user = await prisma.user.findUnique({
            where: { username }
        });

        if (!user) {
            console.log(`[MISSING] User '${username}' (Phone: ${expectedPhone}) not found in DB.`);
            notInDb++;
        } else {
            let issues = [];
            if (user.whatsapp !== expectedPhone) {
                issues.push(`Phone mismatch (DB: ${user.whatsapp}, CSV: ${expectedPhone})`);
                phoneMismatch++;
            }
            if (user.mcn !== true) {
                issues.push(`MCN flag false`);
                mcnFlagMismatch++;
            }

            if (issues.length > 0) {
                console.log(`[MISMATCH] ${username}: ${issues.join(", ")}`);
            } else {
                consistent++;
            }
        }
    }

    console.log("\n--- Summary ---");
    console.log(`Total Rows with Phone: ${validRows}`);
    console.log(`Rows without Phone: ${missingPhone}`);
    console.log("--------------------------------");
    console.log(`✅ Fully Consistent: ${consistent}`);
    console.log(`❌ Missing in DB: ${notInDb}`);
    console.log(`⚠️ Phone Mismatches: ${phoneMismatch}`);
    console.log(`⚠️ MCN Flag Mismatches: ${mcnFlagMismatch}`);

    await prisma.$disconnect();
}

verifyMCNConsistency().catch(console.error);
