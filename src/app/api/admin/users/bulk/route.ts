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

interface CSVUser {
    username: string;
    password: string;
    email?: string;
    name?: string;
    whatsapp?: string;
    go?: boolean;
    mcn?: boolean;
}

// Parse CSV content
function parseCSV(content: string): CSVUser[] {
    const lines = content.split("\n");
    if (lines.length < 2) return [];

    const header = parseCSVLine(lines[0]).map(h => h.toLowerCase().trim());

    // Find column indices
    const usernameIdx = header.findIndex(h => h === "username");
    const passwordIdx = header.findIndex(h => h === "password");
    const emailIdx = header.findIndex(h => h === "email");
    const nameIdx = header.findIndex(h => h === "name");
    const whatsappIdx = header.findIndex(h => h === "whatsapp");
    const goIdx = header.findIndex(h => h === "go");
    const mcnIdx = header.findIndex(h => h === "mcn");

    if (usernameIdx === -1 || passwordIdx === -1) {
        throw new Error("CSV must have 'username' and 'password' columns");
    }

    const results: CSVUser[] = [];

    for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        const cols = parseCSVLine(line);
        const username = cols[usernameIdx]?.trim();
        const password = cols[passwordIdx]?.trim();

        if (username && password) {
            results.push({
                username,
                password,
                email: emailIdx >= 0 ? cols[emailIdx]?.trim() || undefined : undefined,
                name: nameIdx >= 0 ? cols[nameIdx]?.trim() || undefined : undefined,
                whatsapp: whatsappIdx >= 0 ? cols[whatsappIdx]?.trim() || undefined : undefined,
                go: goIdx >= 0 ? cols[goIdx]?.toLowerCase() === "true" || cols[goIdx] === "1" : false,
                mcn: mcnIdx >= 0 ? cols[mcnIdx]?.toLowerCase() === "true" || cols[mcnIdx] === "1" : false,
            });
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

// POST - Bulk import users from CSV
export async function POST(request: NextRequest) {
    if (!(await isAdmin(request))) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
        return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
        async start(controller) {
            const send = (data: object) => {
                controller.enqueue(encoder.encode(sseMessage(data)));
            };

            try {
                // Step 1: Reading file
                send({ step: "reading", progress: 10, message: "Reading file..." });
                const content = await file.text();

                // Step 2: Parsing CSV
                send({ step: "parsing", progress: 20, message: "Parsing CSV..." });
                const csvUsers = parseCSV(content);

                if (csvUsers.length === 0) {
                    send({ step: "error", progress: 0, message: "No valid users found in CSV", error: true });
                    controller.close();
                    return;
                }

                // Step 3: Check existing usernames
                send({ step: "checking", progress: 30, message: `Checking ${csvUsers.length} users...` });
                const usernames = csvUsers.map(u => u.username);
                const existingUsers = await prisma.user.findMany({
                    where: { username: { in: usernames } },
                    select: { username: true }
                });
                const existingUsernames = new Set(existingUsers.map(u => u.username));

                // Filter out existing users
                const newUsers = csvUsers.filter(u => !existingUsernames.has(u.username));

                if (newUsers.length === 0) {
                    send({
                        step: "complete",
                        progress: 100,
                        message: "All users already exist",
                        summary: {
                            totalInCSV: csvUsers.length,
                            skipped: existingUsernames.size,
                            created: 0,
                        }
                    });
                    controller.close();
                    return;
                }

                // Step 4: Hash passwords
                send({ step: "hashing", progress: 50, message: `Hashing ${newUsers.length} passwords...` });
                const bcrypt = await import("bcryptjs");
                const usersWithHashedPasswords = await Promise.all(
                    newUsers.map(async (user) => ({
                        ...user,
                        password: await bcrypt.hash(user.password, 10),
                    }))
                );

                // Step 5: Create users
                send({ step: "creating", progress: 80, message: `Creating ${newUsers.length} users...` });
                const result = await prisma.user.createMany({
                    data: usersWithHashedPasswords.map(u => ({
                        username: u.username,
                        password: u.password,
                        email: u.email || null,
                        name: u.name || null,
                        whatsapp: u.whatsapp || null,
                        go: u.go || false,
                        mcn: u.mcn || false,
                    })),
                    skipDuplicates: true,
                });

                // Step 6: Complete
                send({
                    step: "complete",
                    progress: 100,
                    message: "Import completed!",
                    summary: {
                        totalInCSV: csvUsers.length,
                        skipped: existingUsernames.size,
                        created: result.count,
                    }
                });

            } catch (error) {
                console.error("Error importing users:", error);
                const message = error instanceof Error ? error.message : "Failed to import users";
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
