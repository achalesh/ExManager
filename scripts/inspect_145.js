
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function debug() {
    console.log("Inspecting ID 145...");
    const record = await prisma.staffTicketAssignment.findUnique({
        where: { id: 145 },
        include: { ticketType: true, staff: true }
    });

    if (!record) {
        console.log("ID 145 NOT FOUND!");
        return;
    }

    console.log(JSON.stringify(record, null, 2));

    // Check match against filters
    const isStatusMatch = ['Returned', 'Settled'].includes(record.status);
    const isNameMatch = record.ticketType.name.includes('Entrance');

    console.log(`\n--- Filter Check ---`);
    console.log(`Status '${record.status}' matches? ${isStatusMatch}`);
    console.log(`Ticket '${record.ticketType.name}' matches 'Entrance'? ${isNameMatch}`);
    console.log(`ReturnDate: ${record.returnDate ? record.returnDate.toISOString() : 'NULL'}`);
}

debug()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
