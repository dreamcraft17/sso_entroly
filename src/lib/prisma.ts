import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma";

const globalForPrisma = globalThis as unknown as {
    _prisma: PrismaClient | undefined;
};

/**
 * Get Prisma client instance
 * Uses lazy initialization and driver adapter for Prisma 7+
 */
function getPrismaClient(): PrismaClient {
    if (!globalForPrisma._prisma) {
        // Prisma 7 requires driver adapter for database connection
        const adapter = new PrismaPg({
            connectionString: process.env.DATABASE_URL
        });
        globalForPrisma._prisma = new PrismaClient({ adapter });
    }
    return globalForPrisma._prisma;
}

// Export a proxy that lazily initializes Prisma
export const prisma = new Proxy({} as PrismaClient, {
    get(_, prop) {
        const client = getPrismaClient();
        return (client as unknown as Record<string | symbol, unknown>)[prop];
    },
});
