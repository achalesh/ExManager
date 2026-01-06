
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('Starting Recovery Process...');

    // 1. Find Active Event
    const event = await prisma.event.findFirst({
        where: { status: 'Ongoing' },
        orderBy: { createdAt: 'desc' }
    });

    if (!event) {
        console.error('No ongoing event found.');
        return;
    }

    console.log(`Found Event: ${event.name} (ID: ${event.id})`);

    // 2. Find Assignments with Returns
    const assignments = await prisma.staffTicketAssignment.findMany({
        where: {
            ticketType: { eventId: event.id },
            OR: [
                { status: 'Returned' },
                { status: 'Settled' }
            ],
            returnedCount: { gt: 0 }
        },
        include: { ticketType: true }
    });

    console.log(`Found ${assignments.length} settled/returned assignments with potential returns.`);

    let restoredCount = 0;

    for (const assign of assignments) {
        // Calculate Return Range
        const soldCount = assign.assignedCount - (assign.returnedCount || 0);
        const soldEndNumber = assign.startNumber + soldCount - 1;
        const returnStart = soldEndNumber + 1;
        const returnEnd = assign.endNumber;

        // Validation
        if (returnStart > returnEnd) {
            // Fully sold or invalid
            continue;
        }

        // Check if ALREADY Restored
        const matches = await prisma.ticketInventory.findFirst({
            where: {
                eventId: event.id,
                startNumber: returnStart,
                endNumber: returnEnd
                // Only skip if exact match found (implying we already ran this or logic ran)
            }
        });

        if (!matches) {
            console.log(`Restoring Stock: ${assign.seriesLabel} (${returnStart}-${returnEnd}) for Type: ${assign.ticketType.name}`);

            const label = assign.seriesLabel.endsWith('(Ret)')
                ? assign.seriesLabel
                : `${assign.seriesLabel} (Ret)`;

            await prisma.ticketInventory.create({
                data: {
                    eventId: event.id,
                    seriesLabel: label,
                    startNumber: returnStart,
                    endNumber: returnEnd,
                    currentNumber: returnStart,
                    status: 'Available',
                    price: assign.ticketType.price,
                    category: assign.ticketType.category
                }
            });
            restoredCount++;
        } else {
            // console.log(`Skipping ${assign.seriesLabel} (${returnStart}-${returnEnd}): Overlap found with Inventory ID ${overlap.id}`);
        }
    }

    console.log(`Recovery Complete. Restored ${restoredCount} batches.`);
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
