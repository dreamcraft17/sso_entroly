import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { generateAccessToken, generateRefreshToken } from "@/lib/jwt";
import { setAuthCookies } from "@/lib/cookies";
import { loginSchema } from "@/lib/validations";

// Prevent static generation - this route uses Prisma
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();

        // Validate input
        const result = loginSchema.safeParse(body);
        if (!result.success) {
            return NextResponse.json(
                { error: z.prettifyError(result.error) },
                { status: 400 }
            );
        }

        const { identifier, password } = result.data;
        const normalizedIdentifier = identifier.toLowerCase().trim();

        // Find user by email OR username
        const user = await prisma.user.findFirst({
            where: {
                OR: [
                    { email: normalizedIdentifier },
                    { username: normalizedIdentifier },
                ],
            },
        });

        if (!user) {
            return NextResponse.json(
                { error: "Invalid credentials" },
                { status: 401 }
            );
        }

        // Check if user has a password (might be OAuth-only user)
        if (!user.password) {
            return NextResponse.json(
                { error: "Invalid credentials" },
                { status: 401 }
            );
        }

        // Verify password
        const passwordMatch = await bcrypt.compare(password, user.password);
        if (!passwordMatch) {
            return NextResponse.json(
                { error: "Invalid credentials" },
                { status: 401 }
            );
        }

        // Generate tokens
        const accessToken = await generateAccessToken({
            sub: user.id,
            email: user.email ?? undefined,
            username: user.username ?? undefined,
            name: user.name ?? undefined,
        });

        const refreshToken = await generateRefreshToken(user.id);

        // Set cookies
        await setAuthCookies(accessToken, refreshToken);

        // Get redirect URL from query params
        const redirect = request.nextUrl.searchParams.get("redirect") || "/";

        return NextResponse.json({
            success: true,
            user: {
                id: user.id,
                email: user.email,
                username: user.username,
                name: user.name,
            },
            redirect,
        });

    } catch (error) {
        console.error("Login error:", error);
        return NextResponse.json(
            { error: "An error occurred during login" },
            { status: 500 }
        );
    }
}
