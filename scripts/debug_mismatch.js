
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function debug() {
    const dateStr = '2025-12-20';
    const startOfDay = new Date(dateStr);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(dateStr);
    endOfDay.setHours(23, 59, 59, 999);

    console.log(`Analyzing for Date: ${dateStr}`);
    console.log(`Start: ${startOfDay.toISOString()}`);
    console.log(`End: ${endOfDay.toISOString()}`);

    // Breakdown Check
    console.log(`\n--- Breakdown by Ticket/Price ---`);
    const dateStart = new Date('2025-12-19T00:00:00.000Z');
    const dateEnd = new Date('2025-12-21T23:59:59.999Z');

    const assignments = await prisma.staffTicketAssignment.findMany({
        where: {
            returnDate: { gte: dateStart, lte: dateEnd },
            status: { in: ['Returned', 'Settled'] },
            ticketType: { name: { contains: 'Entrance' } }
        },
        include: { ticketType: true }
    });

    const breakdown = {};
    assignments.forEach(a => {
        const dateKey = a.returnDate.toISOString().split('T')[0];
        const key = `${dateKey} - ${a.ticketType.name}`;
        breakdown[key] = (breakdown[key] || 0) + (a.soldCount || 0);
    });

    console.table(breakdown);

    let total = 0;
    Object.values(breakdown).forEach(v => total += v);
    console.log(`Total: ${total}`);

    // Final Reconciliation
    console.log(`\n--- Final Count Analysis ---`);
    // dateStart and dateEnd are already defined above, but for clarity in this section,
    // we'll use the same values or ensure they are appropriate for this section's scope.
    // For this specific instruction, the re-definition of dateStart/dateEnd is part of the change.

    const allItems = await prisma.ticketSaleItem.findMany({
        where: {
            sale: { createdAt: { gte: dateStart, lte: dateEnd } },
            ticketType: { name: { contains: 'Entrance' } }
        },
        include: { sale: true }
    });

    const bySource = { Staff: 0, Counter: 0 };
    allItems.forEach(i => {
        const src = i.sale.source || 'Counter';
        bySource[src] = (bySource[src] || 0) + 1;
    });

    console.log(`Total DB Items (Raw): ${allItems.length}`);
    console.log(`- From Staff Settlement (Backend Artifacts): ${bySource.Staff}`);
    console.log(`- From Counter (Real Counter Sales): ${bySource.Counter}`);

    const staffAssignments = await prisma.staffTicketAssignment.findMany({
        where: {
            returnDate: { gte: dateStart, lte: dateEnd },
            status: { in: ['Returned', 'Settled'] },
            ticketType: { name: { contains: 'Entrance' } }
        }
    });
    const staffSold = staffAssignments.reduce((sum, s) => sum + (s.soldCount || 0), 0);
    console.log(`- Real Staff Assignments (Daybook uses this): ${staffSold}`);

    console.log(`\nDaybook Calc: Counter (${bySource.Counter}) + Staff Assigns (${staffSold}) = ${bySource.Counter + staffSold}`);


    // 3. Check POTENTIAL Mis-attribution (The "506" source?)

    // Hypothesis A: Assigned Date instead of Return Date?
    const assignedThatDay = await prisma.staffTicketAssignment.findMany({
        where: {
            assignedDate: { gte: startOfDay, lte: endOfDay },
            ticketType: { name: { contains: 'Gate Entry' } }
        },
        select: {
            staff: { select: { name: true } },
            assignedCount: true
        }
    });
    const totalAssigned = assignedThatDay.reduce((sum, s) => sum + s.assignedCount, 0);
    console.log(`\n--- Hypothesis A (Assigned Logic) ---`);
    console.log(`Total Assigned: ${totalAssigned}`);
    assignedThatDay.forEach(s => console.log(`- ${s.staff.name}: ${s.assignedCount}`));

    // Hypothesis C: Check next day too (Timezone issues?)
    const nextDay = new Date(endOfDay);
    nextDay.setDate(nextDay.getDate() + 1);
    const staffReturnsNextDay = await prisma.staffTicketAssignment.findMany({
        where: {
            returnDate: { gte: endOfDay, lte: nextDay },
            status: { in: ['Returned', 'Settled'] },
            ticketType: { name: { contains: 'Gate Entry' } }
        }
    });
    console.log(`\n--- Next Day Returns (21 Dec) ---`);
    console.log(`Count: ${staffReturnsNextDay.length}, Sum: ${staffReturnsNextDay.reduce((s, i) => s + (i.soldCount || 0), 0)}`);

    // Hypothesis B: Ticket Sales INCLUDING Staff (The "Double Count" we fixed)
    const allTicketSales = await prisma.ticketSaleItem.findMany({
        where: {
            sale: {
                createdAt: { gte: startOfDay, lte: endOfDay }
                // No source filter
            },
            ticketType: { name: { contains: 'Gate Entry' } }
        }
    });

    console.log(`\n--- Hypotheses for "506" ---`);
    console.log(`Total Assigned on ${dateStr}: ${totalAssigned}`);
    console.log(`Total TicketSale Rows (Inc. Staff): ${allTicketSales.length}`);

}

debug()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
