import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { registerSchema } from "@/lib/validations";

const BCRYPT_ROUNDS = 12;

// Prevent static generation - this route uses Prisma
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();

        // Validate input
        const result = registerSchema.safeParse(body);
        if (!result.success) {
            return NextResponse.json(
                { error: z.prettifyError(result.error) },
                { status: 400 }
            );
        }

        const { email, username, password, name } = result.data;
        const normalizedEmail = email.toLowerCase().trim();
        const normalizedUsername = username.toLowerCase().trim();

        // Check if email already exists
        const existingEmail = await prisma.user.findUnique({
            where: { email: normalizedEmail },
        });

        if (existingEmail) {
            return NextResponse.json(
                { error: "Email already registered" },
                { status: 409 }
            );
        }

        // Check if username already exists
        const existingUsername = await prisma.user.findUnique({
            where: { username: normalizedUsername },
        });

        if (existingUsername) {
            return NextResponse.json(
                { error: "Username already taken" },
                { status: 409 }
            );
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, BCRYPT_ROUNDS);

        // Create user
        const user = await prisma.user.create({
            data: {
                email: normalizedEmail,
                username: normalizedUsername,
                password: hashedPassword,
                name: name.trim(),
            },
        });

        return NextResponse.json({
            success: true,
            message: "Account created successfully",
            user: {
                id: user.id,
                email: user.email,
                username: user.username,
                name: user.name,
            },
        }, { status: 201 });

    } catch (error) {
        console.error("Registration error:", error);
        return NextResponse.json(
            { error: "An error occurred during registration" },
            { status: 500 }
        );
    }
}
