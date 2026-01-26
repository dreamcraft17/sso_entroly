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

// GET - List all users with commissions
export async function GET(request: NextRequest) {
    if (!(await isAdmin(request))) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    try {
        const searchParams = request.nextUrl.searchParams;
        const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
        const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "20")));
        const search = searchParams.get("search")?.trim() || "";
        const sort = searchParams.get("sort") || "updatedAt";
        const order = searchParams.get("order") || "desc";

        // Build where clause - only users with commission records
        const whereClause: any = {
            commission: { isNot: null }
        };

        // Search filter
        if (search) {
            whereClause.OR = [
                { username: { contains: search, mode: "insensitive" } },
                { email: { contains: search, mode: "insensitive" } },
                { name: { contains: search, mode: "insensitive" } },
            ];
        }

        // Determine order by
        let orderBy: any = {};
        if (sort === "paidCommission") {
            orderBy = { commission: { paidCommission: order } };
        } else if (sort === "pendingCommission") {
            orderBy = { commission: { pendingCommission: order } };
        } else if (sort === "cancelledCommission") {
            orderBy = { commission: { cancelledCommission: order } };
        } else if (sort === "agencyPercentage") {
            orderBy = { commission: { agencyPercentage: order } };
        } else if (sort === "agencyEarning") {
            // Approximate sort: higher pending + higher agency % = higher earning
            orderBy = [
                { commission: { pendingCommission: order } },
                { commission: { agencyPercentage: order } }
            ];
        } else if (sort === "username") {
            orderBy = { username: order };
        } else if (sort === "createdAt") {
            orderBy = { commission: { createdAt: order } };
        } else {
            orderBy = { commission: { updatedAt: order } };
        }

        // Get total count for pagination
        const totalCount = await prisma.user.count({ where: whereClause });
        const totalPages = Math.ceil(totalCount / limit);
        const skip = (page - 1) * limit;

        const users = await prisma.user.findMany({
            where: whereClause,
            select: {
                id: true,
                email: true,
                username: true,
                name: true,
                emailVerified: true,
                image: true,
                manychatId: true,
                whatsapp: true,
                go: true,
                mcn: true,
                createdAt: true,
                updatedAt: true,
                commission: {
                    select: {
                        id: true,
                        paidCommission: true,
                        pendingCommission: true,
                        cancelledCommission: true,
                        agencyPercentage: true,
                        createdAt: true,
                        updatedAt: true,
                    }
                },
                profiles: {
                    select: {
                        id: true,
                        username: true,
                        displayName: true,
                    }
                },
                aiGeneratedPages: {
                    select: {
                        id: true,
                        slug: true,
                        prompt: true,
                        isPublished: true,
                    }
                },
                _count: {
                    select: {
                        profiles: true,
                        aiGeneratedPages: true,
                        refreshTokens: true,
                    }
                }
            },
            orderBy,
            skip,
            take: limit,
        });

        const serializedUsers = users.map(user => {
            // Calculate cancelled percentage: cancelled / (pending + cancelled) * 100
            let cancelledPercentage: number | null = null;
            let agencyEarning: string | null = null;

            if (user.commission) {
                const pending = user.commission.pendingCommission ?? BigInt(0);
                const cancelled = user.commission.cancelledCommission ?? BigInt(0);
                const total = pending + cancelled;
                if (total > BigInt(0)) {
                    // Convert to number for percentage calculation (safe since we're dividing)
                    cancelledPercentage = Math.round(Number(cancelled * BigInt(10000) / total) / 100);
                }

                // Calculate agency earning: agencyPercentage * pendingCommission / 100
                if (user.commission.agencyPercentage != null && pending > BigInt(0)) {
                    const earning = pending * BigInt(user.commission.agencyPercentage) / BigInt(100);
                    agencyEarning = earning.toString();
                }
            }

            return {
                ...user,
                commission: user.commission ? {
                    ...user.commission,
                    paidCommission: user.commission.paidCommission?.toString() || null,
                    pendingCommission: user.commission.pendingCommission?.toString() || null,
                    cancelledCommission: user.commission.cancelledCommission?.toString() || null,
                    agencyPercentage: user.commission.agencyPercentage ?? null,
                    cancelledPercentage,
                    agencyEarning,
                } : null
            };
        });

        return NextResponse.json({
            users: serializedUsers,
            pagination: {
                page,
                limit,
                totalCount,
                totalPages,
                hasMore: page < totalPages,
            },
        });
    } catch (error) {
        console.error("Error fetching commissions:", error);
        return NextResponse.json({ error: "Failed to fetch commissions" }, { status: 500 });
    }
}
