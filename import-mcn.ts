// Import MCN users from CSV - creates new users or updates whatsapp for existing
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "./src/generated/prisma";
import * as fs from "fs";

async function importMCNUsers() {
    // Initialize Prisma with driver adapter
    const adapter = new PrismaPg({
        connectionString: process.env.DATABASE_URL || "postgresql://postgres:postgres@localhost:5432/entroly"
    });
    const prisma = new PrismaClient({ adapter });

    // Read and parse CSV
    const csvPath = "/data/projects/Creators Contact - MCN.csv";
    const csvContent = fs.readFileSync(csvPath, "utf-8");
    const lines = csvContent.split("\n").filter(line => line.trim());

    // Skip header row
    const dataLines = lines.slice(1);

    let created = 0;
    let updated = 0;
    let skipped = 0;

    for (const line of dataLines) {
        // Parse CSV - first two columns are username and phone
        const columns = line.split(",");
        const username = columns[0]?.trim();
        const phone = columns[1]?.trim();

        // Skip if no username
        if (!username) {
            skipped++;
            continue;
        }

        // Skip if no phone number
        if (!phone) {
            skipped++;
            continue;
        }

        // Format phone number (ensure it starts with 62)
        let formattedPhone = phone;
        if (phone.startsWith("0")) {
            formattedPhone = "62" + phone.slice(1);
        } else if (!phone.startsWith("62")) {
            formattedPhone = "62" + phone;
        }

        try {
            // Check if user exists
            const existingUser = await prisma.user.findUnique({
                where: { username }
            });

            if (existingUser) {
                // Update existing user - set mcn=true and update whatsapp
                await prisma.user.update({
                    where: { username },
                    data: {
                        whatsapp: formattedPhone,
                        mcn: true
                    }
                });
                console.log(`Updated: ${username} - WA: ${formattedPhone}`);
                updated++;
            } else {
                // Create new user
                await prisma.user.create({
                    data: {
                        username,
                        whatsapp: formattedPhone,
                        mcn: true
                    }
                });
                console.log(`Created: ${username} - WA: ${formattedPhone}`);
                created++;
            }
        } catch (error: any) {
            console.error(`Error processing ${username}:`, error.message);
        }
    }

    console.log("\n--- Import Summary ---");
    console.log(`Created: ${created}`);
    console.log(`Updated: ${updated}`);
    console.log(`Skipped (no phone): ${skipped}`);
    console.log(`Total processed: ${created + updated + skipped}`);

    await prisma.$disconnect();
}

importMCNUsers().catch(console.error);
