
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "./src/generated/prisma";
import * as fs from "fs";

// CSV Parser (reused logic)
function parseCSVLine(line: string): string[] {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"') {
            inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
            result.push(current);
            current = '';
        } else {
            current += char;
        }
    }
    result.push(current);
    return result;
}

async function importCommissions() {
    // Initialize Prisma
    const adapter = new PrismaPg({
        connectionString: process.env.DATABASE_URL || "postgresql://postgres:postgres@localhost:5432/entroly"
    });
    const prisma = new PrismaClient({ adapter });

    try {
        console.log("Fetching existing users...");
        const users = await prisma.user.findMany({
            select: { id: true, username: true }
        });

        // Map username -> userId (Case insensitive matching? Usually usernames are sensitive or specific. The CSV looks lowercase mostly but best to match exactly or handle simple normalization if needed. Assuming exact match for now as per previous tasks).
        const userMap = new Map<string, string>();
        users.forEach(u => {
            if (u.username) userMap.set(u.username, u.id);
        });

        console.log(`Found ${userMap.size} users in DB.`);

        console.log("Reading CSV...");
        const csvPath = "/data/projects/all_00010101000000_00010101000000_125971444.csv";
        const fileContent = fs.readFileSync(csvPath, "utf-8");
        const lines = fileContent.split("\n").filter(line => line.trim() !== "");

        if (lines.length < 2) {
            console.log("CSV is empty or header only.");
            return;
        }

        const headers = parseCSVLine(lines[0]);
        const idxUsername = headers.indexOf("Creator username");
        const idxEstStdComm = headers.indexOf("Est. standard commission");
        const idxEstRewardFee = headers.indexOf("Est. creator commission reward fee");

        if (idxUsername === -1 || idxEstStdComm === -1 || idxEstRewardFee === -1) {
            console.error("Critical: Missing required columns.");
            console.log("Found headers:", headers);
            return;
        }

        console.log("Processing rows...");
        const userCommissionTotals = new Map<string, number>();

        const dataLines = lines.slice(1);
        let processedRows = 0;
        let matchedUsers = 0;

        for (const line of dataLines) {
            const row = parseCSVLine(line);
            if (row.length !== headers.length) continue;

            const username = row[idxUsername]?.trim();
            if (!username) continue;

            if (userMap.has(username)) {
                // Parse values
                const stdComm = parseFloat(row[idxEstStdComm] || "0");
                const rewardFee = parseFloat(row[idxEstRewardFee] || "0");

                const total = stdComm + rewardFee;

                if (!isNaN(total) && total !== 0) {
                    const currentTotal = userCommissionTotals.get(username) || 0;
                    userCommissionTotals.set(username, currentTotal + total);
                }
                matchedUsers++;
            }
            processedRows++;
        }

        console.log(`Processed ${processedRows} rows.`);
        console.log(`Found data for ${userCommissionTotals.size} unique users in the CSV who exist in our DB.`);

        console.log("Updating database...");

        let updateCount = 0;
        for (const [username, totalAmount] of userCommissionTotals.entries()) {
            const userId = userMap.get(username);
            if (!userId) continue;

            const totalBigInt = BigInt(Math.round(totalAmount)); // Round to nearest integer for IDR

            await prisma.commission.upsert({
                where: { userId: userId },
                create: {
                    userId: userId,
                    pendingCommission: totalBigInt,
                    paidCommission: 0
                },
                update: {
                    pendingCommission: { increment: totalBigInt }
                }
            });
            updateCount++;
            if (updateCount % 50 === 0) process.stdout.write(".");
        }

        console.log("\nSuccess! Updated pending commissions for " + updateCount + " users.");

    } catch (e) {
        console.error("Error importing commissions:", e);
    } finally {
        await prisma.$disconnect();
    }
}

importCommissions();
