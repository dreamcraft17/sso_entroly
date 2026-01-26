
import { NextRequest, NextResponse } from "next/server";
import { verifyAccessToken } from "@/lib/jwt-public";

export const dynamic = "force-dynamic";

const KEY_COOKIE_NAME = "sso_access_token";

// CORS Headers
const corsHeaders = {
    "Access-Control-Allow-Origin": "http://localhost:5500", // Update with production url later
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Allow-Credentials": "true",
};

// Allowed origins for CORS
const allowedOrigins = [
    "http://localhost:5500",
    "http://127.0.0.1:5500",
    "http://localhost:4014",
    "http://entro.ly",
    "http://rank.entro.ly",
    "https://entro.ly",
    "https://rank.entro.ly"
];

// Handle OPTIONS request for CORS (preflight)
export async function OPTIONS(request: NextRequest) {
    const origin = request.headers.get("origin");
    const allowOrigin = origin && allowedOrigins.includes(origin) ? origin : allowedOrigins[0];

    return NextResponse.json({}, {
        headers: {
            "Access-Control-Allow-Origin": allowOrigin,
            "Access-Control-Allow-Methods": "GET, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type, Authorization",
            "Access-Control-Allow-Credentials": "true",
        }
    });
}

export async function GET(request: NextRequest) {
    const origin = request.headers.get("origin");

    // Use module-level allowedOrigins for CORS
    let responseHeaders = { ...corsHeaders };
    if (origin && allowedOrigins.includes(origin)) {
        responseHeaders["Access-Control-Allow-Origin"] = origin;
    }

    const token = request.cookies.get(KEY_COOKIE_NAME)?.value;

    if (!token) {
        return NextResponse.json({ error: "Not authenticated" }, {
            status: 401,
            headers: responseHeaders
        });
    }

    const payload = await verifyAccessToken(token);

    if (!payload) {
        return NextResponse.json({ error: "Invalid token" }, {
            status: 401,
            headers: responseHeaders
        });
    }

    return NextResponse.json({
        user: {
            id: payload.sub,
            email: payload.email,
            username: payload.username,
            name: payload.name
        }
    }, {
        status: 200,
        headers: responseHeaders
    });
}
