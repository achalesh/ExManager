
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fix() {
    console.log("Searching for records with trailing whitespace/newlines in Status...");

    // JS Loop approach for safety and DB-independence
    const candidates = await prisma.staffTicketAssignment.findMany({
        where: {
            OR: [
                { status: { contains: '\n' } },
                { status: { contains: ' ' } } // trailing space
            ]
        }
    });

    console.log(`Found ${candidates.length} records with potential dirty status.`);

    let updated = 0;
    for (const c of candidates) {
        const clean = c.status.trim();
        if (clean !== c.status) {
            await prisma.staffTicketAssignment.update({
                where: { id: c.id },
                data: { status: clean }
            });
            updated++;
            console.log(`- Fixed ID ${c.id}: '${c.status.replace(/\n/g, '\\n')}' -> '${clean}'`);
        }
    }

    console.log(`Total Fixed: ${updated}`);
}

fix()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
