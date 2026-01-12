
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
    const tx = await prisma.transaction.findMany({
        select: { description: true },
        distinct: ['description'],
        take: 20,
        orderBy: { transactionDate: 'desc' },
        where: { NOT: { description: null } }
    });
    console.log("Unique Descriptions Found:", tx.length);
    console.log(tx.map(t => t.description));
}

check()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
