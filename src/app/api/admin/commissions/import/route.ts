import { NextRequest, NextResponse } from "next/server";
import { verifyAccessToken } from "@/lib/jwt-public";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const KEY_COOKIE_NAME = "sso_access_token";

// Check if user is admin
async function isAdmin(request: NextRequest): Promise<boolean> {
    const token = request.cookies.get(KEY_COOKIE_NAME)?.value;
    if (!token) return false;

    const payload = await verifyAccessToken(token);
    if (!payload) return false;

    return payload.username === "entropi";
}

interface CSVRow {
    username: string;
    commission: bigint;
    agencyRate: number | null;
    orderStatus: string | null;
}

// Parse CSV content and extract username + estimated commission + agency rate + order status
function parseCSV(content: string): CSVRow[] {
    const lines = content.split("\n");
    if (lines.length < 2) return [];

    // Get header to find column indices
    const header = parseCSVLine(lines[0]);
    const usernameIndex = header.findIndex(h => h.toLowerCase().includes("creator username"));
    const commissionIndex = header.findIndex(h => h.toLowerCase().includes("est. standard commission"));
    const agencyRateIndex = header.findIndex(h => h.toLowerCase().includes("agency commission rate"));
    const orderStatusIndex = header.findIndex(h => h.toLowerCase().includes("order status"));

    if (usernameIndex === -1 || commissionIndex === -1) {
        throw new Error("Required columns not found: 'Creator username' and 'Est. standard commission'");
    }

    const results: CSVRow[] = [];

    for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        const columns = parseCSVLine(line);
        const username = columns[usernameIndex]?.trim();
        const commissionStr = columns[commissionIndex]?.trim();

        // Parse agency rate if column exists
        let agencyRate: number | null = null;
        if (agencyRateIndex !== -1) {
            const agencyRateStr = columns[agencyRateIndex]?.trim();
            if (agencyRateStr) {
                const parsedRate = parseInt(agencyRateStr.replace(/[^0-9]/g, ""), 10);
                if (!isNaN(parsedRate)) {
                    agencyRate = parsedRate;
                }
            }
        }

        // Parse order status if column exists
        let orderStatus: string | null = null;
        if (orderStatusIndex !== -1) {
            orderStatus = columns[orderStatusIndex]?.trim() || null;
        }

        if (username && commissionStr) {
            // Parse commission value (remove any non-numeric chars except digits)
            const commissionValue = parseInt(commissionStr.replace(/[^0-9]/g, ""), 10);
            if (!isNaN(commissionValue) && commissionValue > 0) {
                results.push({
                    username,
                    commission: BigInt(commissionValue),
                    agencyRate,
                    orderStatus,
                });
            }
        }
    }

    return results;
}

// Parse a single CSV line handling quoted fields
function parseCSVLine(line: string): string[] {
    const result: string[] = [];
    let current = "";
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
        const char = line[i];

        if (char === '"') {
            if (inQuotes && line[i + 1] === '"') {
                current += '"';
                i++;
            } else {
                inQuotes = !inQuotes;
            }
        } else if (char === "," && !inQuotes) {
            result.push(current);
            current = "";
        } else {
            current += char;
        }
    }

    result.push(current);
    return result;
}

// Helper to send SSE message
function sseMessage(data: object): string {
    return `data: ${JSON.stringify(data)}\n\n`;
}

// POST - Import commissions from CSV with streaming progress
export async function POST(request: NextRequest) {
    if (!(await isAdmin(request))) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
        return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // Create a streaming response
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
        async start(controller) {
            const send = (data: object) => {
                controller.enqueue(encoder.encode(sseMessage(data)));
            };

            try {
                // Step 1: Reading file (10%)
                send({ step: "reading", progress: 10, message: "Reading file..." });
                const content = await file.text();

                // Step 2: Parsing CSV (30%)
                send({ step: "parsing", progress: 30, message: "Parsing CSV data..." });
                const csvData = parseCSV(content);

                if (csvData.length === 0) {
                    send({ step: "error", progress: 0, message: "No valid data found in CSV", error: true });
                    controller.close();
                    return;
                }

                // Step 3: Aggregating data (50%)
                send({ step: "aggregating", progress: 50, message: `Aggregating ${csvData.length} orders...` });
                const aggregatedPending = new Map<string, bigint>();
                const aggregatedCancelled = new Map<string, bigint>();
                const maxAgencyRate = new Map<string, number | null>();

                for (const row of csvData) {
                    // Check if order is cancelled (case-insensitive)
                    const isCancelled = row.orderStatus?.toLowerCase() === "cancelled";

                    if (isCancelled) {
                        // Sum cancelled orders separately
                        const currentCancelled = aggregatedCancelled.get(row.username) || BigInt(0);
                        aggregatedCancelled.set(row.username, currentCancelled + row.commission);
                    } else {
                        // Sum non-cancelled orders to pending
                        const currentPending = aggregatedPending.get(row.username) || BigInt(0);
                        aggregatedPending.set(row.username, currentPending + row.commission);
                    }

                    // Track the highest agency rate for each user (from all orders)
                    const currentMaxRate = maxAgencyRate.get(row.username);
                    if (row.agencyRate !== null) {
                        if (currentMaxRate === null || currentMaxRate === undefined || row.agencyRate > currentMaxRate) {
                            maxAgencyRate.set(row.username, row.agencyRate);
                        }
                    } else if (currentMaxRate === undefined) {
                        maxAgencyRate.set(row.username, null);
                    }
                }

                // Get all unique usernames from both maps
                const allUsernames = new Set([...aggregatedPending.keys(), ...aggregatedCancelled.keys()]);

                // Step 4: Matching users (60%)
                send({ step: "matching", progress: 60, message: `Finding ${allUsernames.size} creators in database...` });
                const usernames = Array.from(allUsernames);
                const matchingUsers = await prisma.user.findMany({
                    where: { username: { in: usernames } },
                    select: { id: true, username: true }
                });

                // Step 5: Deleting old commissions (75%)
                send({ step: "deleting", progress: 75, message: "Removing old commission records..." });
                const deleteResult = await prisma.commission.deleteMany({});

                // Step 6: Creating new commissions (90%)
                send({ step: "creating", progress: 90, message: `Creating ${matchingUsers.length} commission records...` });
                const commissionData = matchingUsers
                    .filter(user => user.username && (aggregatedPending.has(user.username) || aggregatedCancelled.has(user.username)))
                    .map(user => ({
                        userId: user.id,
                        pendingCommission: aggregatedPending.get(user.username!) || BigInt(0),
                        cancelledCommission: aggregatedCancelled.get(user.username!) || BigInt(0),
                        paidCommission: BigInt(0),
                        agencyPercentage: maxAgencyRate.get(user.username!) ?? null,
                    }));

                let createdCount = 0;
                if (commissionData.length > 0) {
                    await prisma.commission.createMany({ data: commissionData });
                    createdCount = commissionData.length;
                }

                // Step 7: Complete (100%)
                send({
                    step: "complete",
                    progress: 100,
                    message: "Import completed successfully!",
                    summary: {
                        totalRowsInCSV: csvData.length,
                        uniqueCreators: allUsernames.size,
                        matchedUsers: matchingUsers.length,
                        commissionsDeleted: deleteResult.count,
                        commissionsCreated: createdCount,
                    }
                });

            } catch (error) {
                console.error("Error importing commissions:", error);
                const message = error instanceof Error ? error.message : "Failed to import commissions";
                send({ step: "error", progress: 0, message, error: true });
            } finally {
                controller.close();
            }
        }
    });

    return new Response(stream, {
        headers: {
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
        },
    });
}
