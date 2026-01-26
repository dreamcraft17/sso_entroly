/**
 * JWT Utilities using jose library
 * RS256 asymmetric signing for secure cross-subdomain SSO
 */

import * as jose from "jose";
import { prisma } from "./prisma";

// Token expiration times
const ACCESS_TOKEN_EXPIRY = "3d";   // 3 days - aligned with cookie
const REFRESH_TOKEN_EXPIRY = "7d";  // 7 days

// Get keys from environment
function getPrivateKey(): string {
    const key = process.env.JWT_PRIVATE_KEY;
    if (!key) throw new Error("JWT_PRIVATE_KEY not configured");
    return key.replace(/\\n/g, "\n");
}

function getPublicKey(): string {
    const key = process.env.JWT_PUBLIC_KEY;
    if (!key) throw new Error("JWT_PUBLIC_KEY not configured");
    return key.replace(/\\n/g, "\n");
}

export interface TokenPayload {
    sub: string;      // User ID
    email?: string;   // Optional email
    username?: string;
    name?: string;
}

export interface AccessTokenPayload extends TokenPayload {
    type: "access";
}

export interface RefreshTokenPayload {
    sub: string;      // User ID
    type: "refresh";
    jti: string;      // Token ID for revocation
}

/**
 * Generate access token (short-lived)
 */
export async function generateAccessToken(payload: TokenPayload): Promise<string> {
    const privateKey = await jose.importPKCS8(getPrivateKey(), "RS256");

    const token = await new jose.SignJWT({
        ...payload,
        type: "access",
    })
        .setProtectedHeader({ alg: "RS256", typ: "JWT" })
        .setIssuedAt()
        .setExpirationTime(ACCESS_TOKEN_EXPIRY)
        .setIssuer("sso.entro.ly")
        .setAudience(["entro.ly", "rank.entro.ly"])
        .sign(privateKey);

    return token;
}

/**
 * Generate refresh token (long-lived, stored in DB)
 */
export async function generateRefreshToken(userId: string): Promise<string> {
    const privateKey = await jose.importPKCS8(getPrivateKey(), "RS256");
    const jti = crypto.randomUUID();

    // Calculate expiry date
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days

    // Store in database for revocation
    await prisma.refreshToken.create({
        data: {
            token: jti,
            userId,
            expiresAt,
        },
    });

    const token = await new jose.SignJWT({
        sub: userId,
        type: "refresh",
    })
        .setProtectedHeader({ alg: "RS256", typ: "JWT" })
        .setIssuedAt()
        .setExpirationTime(REFRESH_TOKEN_EXPIRY)
        .setJti(jti)
        .setIssuer("sso.entro.ly")
        .sign(privateKey);

    return token;
}

/**
 * Verify access token
 */
export async function verifyAccessToken(token: string): Promise<AccessTokenPayload | null> {
    try {
        const publicKey = await jose.importSPKI(getPublicKey(), "RS256");

        const { payload } = await jose.jwtVerify(token, publicKey, {
            issuer: "sso.entro.ly",
            audience: ["entro.ly", "rank.entro.ly"],
        });

        if (payload.type !== "access") return null;

        return payload as unknown as AccessTokenPayload;
    } catch {
        return null;
    }
}

/**
 * Verify refresh token and check if revoked
 */
export async function verifyRefreshToken(token: string): Promise<RefreshTokenPayload | null> {
    try {
        const publicKey = await jose.importSPKI(getPublicKey(), "RS256");

        const { payload } = await jose.jwtVerify(token, publicKey, {
            issuer: "sso.entro.ly",
            audience: ["entro.ly", "rank.entro.ly"],
        });

        if (payload.type !== "refresh" || !payload.jti) return null;

        // Check if token is revoked in database
        const storedToken = await prisma.refreshToken.findUnique({
            where: { token: payload.jti },
        });

        if (!storedToken || storedToken.revoked) return null;

        return payload as unknown as RefreshTokenPayload;
    } catch {
        return null;
    }
}

/**
 * Revoke a refresh token
 */
export async function revokeRefreshToken(jti: string): Promise<void> {
    await prisma.refreshToken.update({
        where: { token: jti },
        data: { revoked: true },
    });
}

/**
 * Revoke all refresh tokens for a user (logout everywhere)
 */
export async function revokeAllUserTokens(userId: string): Promise<void> {
    await prisma.refreshToken.updateMany({
        where: { userId },
        data: { revoked: true },
    });
}

/**
 * Get JWKS (JSON Web Key Set) for public key distribution
 */
export async function getJWKS(): Promise<jose.JSONWebKeySet> {
    const publicKey = await jose.importSPKI(getPublicKey(), "RS256");
    const jwk = await jose.exportJWK(publicKey);

    return {
        keys: [
            {
                ...jwk,
                kid: "sso-entro-ly-1",
                use: "sig",
                alg: "RS256",
            },
        ],
    };
}
