
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "./src/generated/prisma";

async function verify() {
    const adapter = new PrismaPg({
        connectionString: process.env.DATABASE_URL || "postgresql://postgres:postgres@localhost:5432/entroly"
    });
    const prisma = new PrismaClient({ adapter });

    const usernames = ["maherzaaaaa", "abang.adik2"];

    for (const u of usernames) {
        const user = await prisma.user.findUnique({
            where: { username: u },
            include: { commission: true }
        });

        if (user) {
            console.log(`User: ${u}`);
            console.log(`Pending Commission: ${user.commission?.pendingCommission}`);
        } else {
            console.log(`User ${u} not found in DB.`);
        }
    }
    await prisma.$disconnect();
}
verify();
