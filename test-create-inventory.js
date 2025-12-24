const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testCreate() {
    const materialId = 1; // Chair
    const quantity = 5;
    const prefix = 'TEST-MAT-CHA-';

    try {
        console.log(`Attempting to create ${quantity} items for material ${materialId}...`);

        // Clean up previous test run
        await prisma.materialItem.deleteMany({
            where: { uniqueCode: { startsWith: prefix } }
        });

        // 1. Fetch Existing
        const existingItems = await prisma.materialItem.findMany({
            where: {
                materialId: materialId,
                uniqueCode: { startsWith: prefix }
            },
            select: { uniqueCode: true }
        });

        let maxSerial = 0;
        existingItems.forEach(item => {
            const part = item.uniqueCode.replace(prefix, '');
            const num = parseInt(part);
            if (!isNaN(num) && num > maxSerial) maxSerial = num;
        });

        console.log('MaxSerial:', maxSerial);

        // 2. Generate
        const newItems = [];
        for (let i = 1; i <= quantity; i++) {
            const serialNumber = (maxSerial + i).toString().padStart(3, '0');
            newItems.push({
                materialId: materialId,
                uniqueCode: `${prefix}${serialNumber}`,
                status: 'Available',
            });
        }

        console.log('Generated Data:', newItems);

        // 3. Create
        const result = await prisma.materialItem.createMany({
            data: newItems,
        });

        console.log('Success! Result:', result);

    } catch (e) {
        console.error('FAILED:', e);
    } finally {
        await prisma.$disconnect();
    }
}

testCreate();
