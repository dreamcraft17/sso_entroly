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

// PATCH - Update kasbon status
export async function PATCH(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    if (!(await isAdmin(request))) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    try {
        const { id } = await params;
        const data = await request.json();
        const { status, adminNote } = data;

        // Validate status
        const validStatuses = ["REQUESTED", "PENDING", "COMPLETED", "REJECTED"];
        if (status && !validStatuses.includes(status)) {
            return NextResponse.json({ error: "Invalid status" }, { status: 400 });
        }

        // Check if kasbon exists
        const kasbon = await prisma.kasbon.findUnique({
            where: { id },
        });

        if (!kasbon) {
            return NextResponse.json({ error: "Kasbon not found" }, { status: 404 });
        }

        // Update kasbon
        const updateData: Record<string, unknown> = {};
        if (status) updateData.status = status;
        if (adminNote !== undefined) updateData.adminNote = adminNote;

        const updatedKasbon = await prisma.kasbon.update({
            where: { id },
            data: updateData,
            include: {
                user: {
                    select: {
                        id: true,
                        username: true,
                        email: true,
                        name: true,
                    }
                }
            }
        });

        return NextResponse.json({
            ...updatedKasbon,
            amount: updatedKasbon.amount.toString(),
        });
    } catch (error) {
        console.error("Error updating kasbon:", error);
        return NextResponse.json({ error: "Failed to update kasbon" }, { status: 500 });
    }
}
