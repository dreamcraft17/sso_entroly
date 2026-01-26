
import * as fs from 'fs';
import * as path from 'path';

const csvPath = '/data/projects/Creators Contact - MCN.csv';

function analyzeCsv() {
    const fileContent = fs.readFileSync(csvPath, 'utf8');
    const lines = fileContent.split('\n').filter(line => line.trim() !== '');

    // Header analysis
    const header = lines[0].split(',');
    console.log(`Total Rows (excluding header): ${lines.length - 1}`);
    console.log(`Columns: ${header.length}`);

    const usernames = new Map<string, number[]>(); // username -> line numbers
    const phones = new Map<string, number[]>(); // phone -> line numbers
    const missingPhoneLines: number[] = [];
    const invalidPhoneFormatLines: Array<{ line: number, phone: string }> = [];

    const dataLines = lines.slice(1);

    dataLines.forEach((line, index) => {
        const lineNumber = index + 2; // +1 for header, +1 for 0-index
        const columns = line.split(',');
        const username = columns[0]?.trim();
        const phone = columns[1]?.trim();

        // 1. Check Usernames
        if (username) {
            if (!usernames.has(username)) {
                usernames.set(username, []);
            }
            usernames.get(username)?.push(lineNumber);
        }

        // 2. Check Phones
        if (!phone) {
            missingPhoneLines.push(lineNumber);
        } else {
            // Check consistency
            if (!phones.has(phone)) {
                phones.set(phone, []);
            }
            phones.get(phone)?.push(lineNumber);

            // Check format (basic check for numeric and length)
            if (!/^\d+$/.test(phone)) {
                // It might have other chars?
            }
            // Check starts with 62 or 08
            if (!phone.startsWith('62') && !phone.startsWith('08')) {
                // console.log(`Weird phone format at line ${lineNumber}: ${phone}`);
            }
        }
    });

    // Report Usernames
    console.log('\n--- Duplicate Usernames ---');
    let dupUserCount = 0;
    usernames.forEach((lines, user) => {
        if (lines.length > 1) {
            console.log(`User '${user}' appears on lines: ${lines.join(', ')}`);
            dupUserCount++;
        }
    });
    if (dupUserCount === 0) console.log('None.');

    // Report Phones
    console.log('\n--- Duplicate Phone Numbers ---');
    let dupPhoneCount = 0;
    phones.forEach((lines, phone) => {
        if (lines.length > 1) {
            console.log(`Phone '${phone}' appears on lines: ${lines.join(', ')}`);
            dupPhoneCount++;
        }
    });
    if (dupPhoneCount === 0) console.log('None.');

    // Report Missing Phones
    console.log('\n--- Missing Phone Numbers ---');
    console.log(`Total Count: ${missingPhoneLines.length}`);
    if (missingPhoneLines.length > 0) {
        console.log(`Lines: ${missingPhoneLines.slice(0, 10).join(', ')}${missingPhoneLines.length > 10 ? '...' : ''}`);
        // Check if missing phones are grouped at the end
        if (missingPhoneLines[0] === 149) { // Based on my previous visual inspection
            console.log('Observation: Missing phones start significantly from line 149 onwards.');
        }
    }

    // Report Phone Formatting
    console.log('\n--- Phone Number Formatting ---');
    const potentialFormatIssues: string[] = [];
    phones.forEach((_, phone) => {
        if (phone.startsWith('08')) {
            potentialFormatIssues.push(phone);
        }
    });
    console.log(`Phones starting with '08' (local format, inconsistent with '62'): ${potentialFormatIssues.length}`);
    if (potentialFormatIssues.length > 0) {
        console.log(`Examples: ${potentialFormatIssues.slice(0, 5).join(', ')}`);
    }

    // General Structure
    console.log('\n--- General Structure/Parsing ---');
    // Check for potential misaligned rows (e.g. empty username)
    const emptyUsernames = dataLines.filter(l => !l.split(',')[0].trim());
    if (emptyUsernames.length > 0) {
        console.log(`Found ${emptyUsernames.length} rows with empty usernames.`);
    }
}

analyzeCsv();
