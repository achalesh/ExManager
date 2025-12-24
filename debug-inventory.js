const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkChairItems() {
    try {
        const chair = await prisma.material.findFirst({
            where: { name: { contains: 'Chair' } }
        });

        if (!chair) {
            console.log('No "Chair" found.');
            return;
        }

        console.log('Found Chair:', chair);

        const items = await prisma.materialItem.findMany({
            where: { materialId: chair.id }
        });

        console.log(`Found ${items.length} items for Chair.`);
        items.forEach(item => {
            console.log(`- ${item.uniqueCode} (Status: ${item.status})`);
        });

        // Test buffer generation logic
        const prefix = `MAT-${chair.name.substring(0, 3).toUpperCase()}-`;
        console.log('Expected Prefix:', prefix);

        let maxSerial = 0;
        items.forEach(item => {
            if (item.uniqueCode.startsWith(prefix)) {
                const part = item.uniqueCode.replace(prefix, '');
                const num = parseInt(part);
                console.log(`  Parsing ${item.uniqueCode} -> Part: "${part}" -> Num: ${num}`);
                if (!isNaN(num) && num > maxSerial) {
                    maxSerial = num;
                }
            } else {
                console.log(`  Skipping ${item.uniqueCode} (Does not match prefix)`);
            }
        });
        console.log('Calculated Max Serial:', maxSerial);
        console.log('Next would be:', (maxSerial + 1).toString().padStart(3, '0'));

    } catch (e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}

checkChairItems();
