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

// GET - List all kasbon requests
export async function GET(request: NextRequest) {
    if (!(await isAdmin(request))) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    try {
        const searchParams = request.nextUrl.searchParams;
        const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
        const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "20")));
        const search = searchParams.get("search")?.trim() || "";
        const status = searchParams.get("status") || "all";
        const sort = searchParams.get("sort") || "createdAt";
        const order = searchParams.get("order") || "desc";

        // Build where clause
        const whereClause: Record<string, unknown> = {};

        // Status filter
        if (status !== "all") {
            whereClause.status = status;
        }

        // Search filter - search by user's username, email, or name
        if (search) {
            whereClause.user = {
                OR: [
                    { username: { contains: search, mode: "insensitive" } },
                    { email: { contains: search, mode: "insensitive" } },
                    { name: { contains: search, mode: "insensitive" } },
                ]
            };
        }

        // Determine order by
        let orderBy: Record<string, unknown> = {};
        if (sort === "amount") {
            orderBy = { amount: order };
        } else if (sort === "status") {
            orderBy = { status: order };
        } else if (sort === "updatedAt") {
            orderBy = { updatedAt: order };
        } else {
            orderBy = { createdAt: order };
        }

        // Get total count for pagination
        const totalCount = await prisma.kasbon.count({ where: whereClause });
        const totalPages = Math.ceil(totalCount / limit);
        const skip = (page - 1) * limit;

        const kasbons = await prisma.kasbon.findMany({
            where: whereClause,
            include: {
                user: {
                    select: {
                        id: true,
                        username: true,
                        email: true,
                        name: true,
                        whatsapp: true,
                    }
                }
            },
            orderBy,
            skip,
            take: limit,
        });

        // Convert BigInt to string for JSON serialization
        const serializedKasbons = kasbons.map(kasbon => ({
            ...kasbon,
            amount: kasbon.amount.toString(),
        }));

        return NextResponse.json({
            kasbons: serializedKasbons,
            pagination: {
                page,
                limit,
                totalCount,
                totalPages,
                hasMore: page < totalPages,
            },
        });
    } catch (error) {
        console.error("Error fetching kasbons:", error);
        return NextResponse.json({ error: "Failed to fetch kasbons" }, { status: 500 });
    }
}
