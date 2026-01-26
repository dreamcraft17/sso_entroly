import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { verifyAccessToken } from "@/lib/jwt-public";
import { changePasswordSchema } from "@/lib/validations";

// Prevent static generation - this route uses Prisma
export const dynamic = "force-dynamic";

const KEY_COOKIE_NAME = "sso_access_token";

export async function POST(request: NextRequest) {
    try {
        // Get and verify access token
        const token = request.cookies.get(KEY_COOKIE_NAME)?.value;

        if (!token) {
            return NextResponse.json(
                { error: "Not authenticated" },
                { status: 401 }
            );
        }

        const payload = await verifyAccessToken(token);

        if (!payload || !payload.sub) {
            return NextResponse.json(
                { error: "Invalid token" },
                { status: 401 }
            );
        }

        const body = await request.json();

        // Validate input
        const result = changePasswordSchema.safeParse(body);
        if (!result.success) {
            return NextResponse.json(
                { error: z.prettifyError(result.error) },
                { status: 400 }
            );
        }

        const { oldPassword, newPassword } = result.data;

        // Find user
        const user = await prisma.user.findUnique({
            where: { id: payload.sub },
        });

        if (!user) {
            return NextResponse.json(
                { error: "User not found" },
                { status: 404 }
            );
        }

        // Check if user has a password set
        if (!user.password) {
            return NextResponse.json(
                { error: "Cannot change password - no password set" },
                { status: 400 }
            );
        }

        // Verify old password
        const passwordMatch = await bcrypt.compare(oldPassword, user.password);
        if (!passwordMatch) {
            return NextResponse.json(
                { error: "Current password is incorrect" },
                { status: 400 }
            );
        }

        // Check if new password is same as old
        const sameAsOld = await bcrypt.compare(newPassword, user.password);
        if (sameAsOld) {
            return NextResponse.json(
                { error: "New password must be different from current password" },
                { status: 400 }
            );
        }

        // Hash new password
        const hashedPassword = await bcrypt.hash(newPassword, 12);

        // Update password
        await prisma.user.update({
            where: { id: user.id },
            data: { password: hashedPassword },
        });

        return NextResponse.json({
            success: true,
            message: "Password changed successfully",
        });

    } catch (error) {
        console.error("Change password error:", error);
        return NextResponse.json(
            { error: "An error occurred while changing password" },
            { status: 500 }
        );
    }
}
