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

// GET - List all users with statistics and pagination
export async function GET(request: NextRequest) {
    if (!(await isAdmin(request))) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    try {
        // Parse query params for pagination, search, filter, and sort
        const searchParams = request.nextUrl.searchParams;
        const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
        const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "20")));
        const search = searchParams.get("search")?.trim() || "";
        const filter = searchParams.get("filter") || "all";
        const sort = searchParams.get("sort") || "createdAt";
        const order = searchParams.get("order") || "desc";

        // Build where clause
        const whereClause: any = {};

        // Search filter
        if (search) {
            whereClause.OR = [
                { username: { contains: search, mode: "insensitive" } },
                { email: { contains: search, mode: "insensitive" } },
                { name: { contains: search, mode: "insensitive" } },
                { manychatId: { contains: search, mode: "insensitive" } },
            ];
        }

        // Status filters
        if (filter === "go") {
            whereClause.go = true;
        } else if (filter === "mcn") {
            whereClause.mcn = true;
        } else if (filter === "go_and_mcn") {
            whereClause.go = true;
            whereClause.mcn = true;
        } else if (filter === "verified") {
            whereClause.emailVerified = { not: null };
        }

        // Determine order by
        let orderBy: any = {};
        if (sort === "username") {
            orderBy = { username: order };
        } else if (sort === "email") {
            orderBy = { email: order };
        } else {
            orderBy = { createdAt: order };
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
                },
                commission: {
                    select: {
                        id: true,
                        paidCommission: true,
                        pendingCommission: true,
                        createdAt: true,
                        updatedAt: true,
                    }
                }
            },
            orderBy,
            skip,
            take: limit,
        });

        // Conditionally get statistics
        let statistics = undefined;
        if (searchParams.get("includeStats") === "true") {
            const allUsersStats = await prisma.user.aggregate({
                _count: { id: true },
            });

            const verifiedCount = await prisma.user.count({
                where: { emailVerified: { not: null } }
            });

            const profileCount = await prisma.profile.count();
            const aiPageCount = await prisma.aIGeneratedPage.count();

            // Users created in last 7 days
            const sevenDaysAgo = new Date();
            sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
            const newUsersThisWeek = await prisma.user.count({
                where: { createdAt: { gt: sevenDaysAgo } }
            });

            // Users created in last 30 days
            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
            const newUsersThisMonth = await prisma.user.count({
                where: { createdAt: { gt: thirtyDaysAgo } }
            });

            statistics = {
                totalUsers: allUsersStats._count.id,
                verifiedUsers: verifiedCount,
                totalProfiles: profileCount,
                totalAIPages: aiPageCount,
                newUsersThisWeek,
                newUsersThisMonth,
            };
        }

        // Serialize BigInt values for JSON
        const serializedUsers = users.map(user => ({
            ...user,
            commission: user.commission ? {
                ...user.commission,
                paidCommission: user.commission.paidCommission?.toString() || null,
                pendingCommission: user.commission.pendingCommission?.toString() || null,
            } : null
        }));

        return NextResponse.json({
            users: serializedUsers,
            pagination: {
                page,
                limit,
                totalCount,
                totalPages,
                hasMore: page < totalPages,
            },
            statistics,
        });
    } catch (error) {
        console.error("Error fetching users:", error);
        return NextResponse.json({ error: "Failed to fetch users" }, { status: 500 });
    }
}

// POST - Create a new user
export async function POST(request: NextRequest) {
    if (!(await isAdmin(request))) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    try {
        const { email, username, password, name, go, mcn, manychatId, whatsapp } = await request.json();

        if (!username || !password) {
            return NextResponse.json({ error: "Username and password are required" }, { status: 400 });
        }

        // Check if username or email already exists
        const existingUser = await prisma.user.findFirst({
            where: {
                OR: [
                    { username },
                    ...(email ? [{ email }] : [])
                ]
            }
        });

        if (existingUser) {
            return NextResponse.json({ error: "Username or email already exists" }, { status: 400 });
        }

        // Hash password
        const bcrypt = await import("bcryptjs");
        const hashedPassword = await bcrypt.hash(password, 10);

        const user = await prisma.user.create({
            data: {
                email: email || null,
                username,
                password: hashedPassword,
                name: name || null,
                go: go || false,
                mcn: mcn || false,
                manychatId: manychatId || null,
                whatsapp: whatsapp || null,
            },
            select: {
                id: true,
                email: true,
                username: true,
                name: true,
                createdAt: true,
            }
        });

        return NextResponse.json({ user }, { status: 201 });
    } catch (error) {
        console.error("Error creating user:", error);
        return NextResponse.json({ error: "Failed to create user" }, { status: 500 });
    }
}
