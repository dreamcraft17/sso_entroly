import { NextResponse } from "next/server";
import { getJWKS } from "@/lib/jwt-public";

// Prevent static generation - this route needs env vars at runtime
export const dynamic = "force-dynamic";

/**
 * JWKS endpoint for public key distribution
 * Other apps can use this to verify JWT tokens
 */
export async function GET() {
    try {
        const jwks = await getJWKS();

        return NextResponse.json(jwks, {
            headers: {
                "Cache-Control": "public, max-age=3600", // Cache for 1 hour
            },
        });
    } catch (error) {
        console.error("JWKS error:", error);
        return NextResponse.json(
            { error: "Failed to get JWKS" },
            { status: 500 }
        );
    }
}
