// Script to import ManyChat contacts data into User table
const { PrismaClient } = require('./src/generated/prisma');
const fs = require('fs');

const prisma = new PrismaClient();

async function importContacts() {
    // Read CSV file
    const csvPath = process.argv[2] || '/data/projects/Export Contacts - Sheet1.csv';
    const csvContent = fs.readFileSync(csvPath, 'utf-8');

    // Parse CSV
    const lines = csvContent.trim().split('\n');
    const headers = lines[0].replace('\r', '').split(',');

    console.log('Headers:', headers);
    console.log(`Found ${lines.length - 1} contacts to process`);

    let updated = 0;
    let notFound = 0;
    let errors = 0;

    for (let i = 1; i < lines.length; i++) {
        const values = lines[i].replace('\r', '').split(',');
        const manychatId = values[0];
        const username = values[2]; // username is the 3rd column
        const go = values[3] === 'TRUE';
        const mcn = values[4] === 'TRUE';

        if (!username) {
            console.log(`Skipping line ${i + 1}: no username`);
            continue;
        }

        try {
            // Find user by username
            const user = await prisma.user.findUnique({
                where: { username: username }
            });

            if (user) {
                // Update user with ManyChat data
                await prisma.user.update({
                    where: { id: user.id },
                    data: {
                        manychatId: manychatId,
                        go: go,
                        mcn: mcn
                    }
                });
                updated++;
                console.log(`✓ Updated ${username} - ManyChat: ${manychatId}, GO: ${go}, MCN: ${mcn}`);
            } else {
                notFound++;
                if (notFound <= 10) {
                    console.log(`✗ User not found: ${username}`);
                }
            }
        } catch (err) {
            errors++;
            console.error(`Error processing ${username}:`, err.message);
        }
    }

    console.log('\n=== Import Summary ===');
    console.log(`Updated: ${updated}`);
    console.log(`Not found: ${notFound}`);
    console.log(`Errors: ${errors}`);

    await prisma.$disconnect();
}

importContacts().catch(console.error);
