// Simplified import script with proper connection management
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "./src/generated/prisma";
import * as fs from "fs";

async function importContacts() {
    // Initialize Prisma with driver adapter
    const adapter = new PrismaPg({
        connectionString: process.env.DATABASE_URL || "postgresql://postgres:postgres@localhost:5432/entroly"
    });
    const prisma = new PrismaClient({ adapter });

    // Read CSV file
    const csvPath = "/data/projects/Export Contacts - Sheet1.csv";
    const csvContent = fs.readFileSync(csvPath, "utf-8");

    // Parse CSV
    const lines = csvContent.trim().split("\n");
    const headers = lines[0].replace("\r", "").split(",");

    console.log("Headers:", headers);
    console.log(`Found ${lines.length - 1} contacts to process`);

    let updated = 0;
    let notFound = 0;
    let errors = 0;
    const notFoundList: string[] = [];

    for (let i = 1; i < lines.length; i++) {
        const values = lines[i].replace("\r", "").split(",");
        const manychatId = values[0];
        const username = values[2]; // username is the 3rd column
        const go = values[3] === "TRUE";
        const mcn = values[4] === "TRUE";

        if (!username) {
            continue;
        }

        try {
            // Find and update user by username
            const result = await prisma.user.updateMany({
                where: { username: username },
                data: {
                    manychatId: manychatId,
                    go: go,
                    mcn: mcn
                }
            });

            if (result.count > 0) {
                updated++;
                if (go || mcn) {
                    console.log(`✓ Updated ${username} - ManyChat: ${manychatId}, GO: ${go}, MCN: ${mcn}`);
                }
            } else {
                notFound++;
                notFoundList.push(username);
            }
        } catch (err: any) {
            errors++;
            console.error(`Error processing ${username}:`, err.message);
        }
    }

    console.log("\n=== Import Summary ===");
    console.log(`Updated: ${updated}`);
    console.log(`Not found: ${notFound}`);
    console.log(`Errors: ${errors}`);

    if (notFoundList.length > 0 && notFoundList.length <= 20) {
        console.log("\nUsers not found:", notFoundList.join(", "));
    }

    await prisma.$disconnect();
}

importContacts().catch(console.error);
