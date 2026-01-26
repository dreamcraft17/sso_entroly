/**
 * JWT Public Key Utilities
 * These functions don't require database access and can be used at build time
 */

import * as jose from "jose";

function getPublicKey(): string {
    const key = process.env.JWT_PUBLIC_KEY;
    if (!key) throw new Error("JWT_PUBLIC_KEY not configured");
    return key.replace(/\\n/g, "\n");
}

export interface AccessTokenPayload {
    sub: string;
    email: string;
    username?: string;
    name?: string;
    type: "access";
}

/**
 * Verify access token (no database required)
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
 * Get JWKS (JSON Web Key Set) for public key distribution
 * No database required
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
