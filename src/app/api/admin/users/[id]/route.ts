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

// GET - Get single user details
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    if (!(await isAdmin(request))) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { id } = await params;

    try {
        const user = await prisma.user.findUnique({
            where: { id },
            select: {
                id: true,
                email: true,
                username: true,
                name: true,
                emailVerified: true,
                image: true,
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
                        refreshTokens: true,
                    }
                }
            }
        });

        if (!user) {
            return NextResponse.json({ error: "User not found" }, { status: 404 });
        }

        return NextResponse.json({ user });
    } catch (error) {
        console.error("Error fetching user:", error);
        return NextResponse.json({ error: "Failed to fetch user" }, { status: 500 });
    }
}

// PATCH - Update user
export async function PATCH(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    if (!(await isAdmin(request))) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { id } = await params;

    try {
        const body = await request.json();
        const { email, username, password, name, go, mcn, whatsapp } = body;

        // Check if user exists
        const existingUser = await prisma.user.findUnique({ where: { id } });
        if (!existingUser) {
            return NextResponse.json({ error: "User not found" }, { status: 404 });
        }

        // Check for duplicate username/email
        if (username && username !== existingUser.username) {
            const duplicateUsername = await prisma.user.findUnique({ where: { username } });
            if (duplicateUsername) {
                return NextResponse.json({ error: "Username already exists" }, { status: 400 });
            }
        }

        if (email && email !== existingUser.email) {
            const duplicateEmail = await prisma.user.findUnique({ where: { email } });
            if (duplicateEmail) {
                return NextResponse.json({ error: "Email already exists" }, { status: 400 });
            }
        }

        // Build update data
        const updateData: Record<string, unknown> = {};
        if (email !== undefined) updateData.email = email || null;
        if (username !== undefined) updateData.username = username;
        if (name !== undefined) updateData.name = name || null;
        if (go !== undefined) updateData.go = go;
        if (mcn !== undefined) updateData.mcn = mcn;
        if (whatsapp !== undefined) updateData.whatsapp = whatsapp || null;

        // Hash password if provided
        if (password) {
            const bcrypt = await import("bcryptjs");
            updateData.password = await bcrypt.hash(password, 10);
        }

        const user = await prisma.user.update({
            where: { id },
            data: updateData,
            select: {
                id: true,
                email: true,
                username: true,
                name: true,
                createdAt: true,
                updatedAt: true,
            }
        });

        return NextResponse.json({ user });
    } catch (error) {
        console.error("Error updating user:", error);
        return NextResponse.json({ error: "Failed to update user" }, { status: 500 });
    }
}

// DELETE - Delete user
export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    if (!(await isAdmin(request))) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { id } = await params;

    try {
        // Check if user exists
        const existingUser = await prisma.user.findUnique({ where: { id } });
        if (!existingUser) {
            return NextResponse.json({ error: "User not found" }, { status: 404 });
        }

        // Prevent deleting admin account
        if (existingUser.username === "admin") {
            return NextResponse.json({ error: "Cannot delete admin account" }, { status: 400 });
        }

        await prisma.user.delete({ where: { id } });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Error deleting user:", error);
        return NextResponse.json({ error: "Failed to delete user" }, { status: 500 });
    }
}
