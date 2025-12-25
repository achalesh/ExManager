import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({
    datasources: {
        db: {
            url: "postgresql://neondb_owner:npg_AMSBFcZtVD08@ep-shy-block-a1mls7vu-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require"
        }
    }
});

async function main() {
    console.log('Resetting sequences...');

    // List of table names to reset sequences for
    const tables = [
        'User',
        'Event',
        'Role',
        'Space',
        'Exhibitor',
        'Booking',
        'Invoice',
        'Payment',
        'Transaction',
        'TicketInventory',
        'Staff',
        'StaffTicketAssignment',
        'SpaceCategory',
        'Resource', // Check if this exists, maybe 'Material' etc? Checking schema...
        'Material',
        'MaterialItem',
        'ElectricalItem',
        'Shed',
        'MaterialAllocation',
        'ElectricalAllocation',
        'ShedAllocation',
        'TicketType',
        'TicketBatch',
        'TicketSale',
        'TicketSaleItem',
        'AuditLog',
        'Session',
        'PasswordResetRequest'
    ];

    for (const table of tables) {
        try {
            // The table names in Prisma schema are PascalCase, but in Postgres they are usually mapped directly if not using @map.
            // Prisma usually quotes identifiers.
            // The safe way is to query the table name dynamically or try standard casing.
            // We will try to run the setval query.

            // Note: Relation tables or tables without auto-inc ID might fail, we catch those.
            await prisma.$executeRawUnsafe(`SELECT setval(pg_get_serial_sequence('"${table}"', 'id'), coalesce(max(id)+1, 1), false) FROM "${table}";`);
            console.log(`✅ Reset sequence for ${table}`);
        } catch (error) {
            console.log(`⚠️  Could not reset sequence for ${table}:`, (error as Error).message.split('\n')[0]);
        }
    }
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
