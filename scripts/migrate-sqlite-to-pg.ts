
import { PrismaClient } from '@prisma/client';
// @ts-ignore
import { PrismaClient as SqliteClient } from '../prisma/generated/client-sqlite';

const prisma = new PrismaClient({
    datasources: {
        db: {
            url: "postgresql://neondb_owner:npg_AMSBFcZtVD08@ep-shy-block-a1mls7vu-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require"
        }
    }
});
const sqlite = new SqliteClient();

async function migrate() {
    console.log('Starting migration from SQLite to Postgres...');

    try {
        // 1. Roles
        console.log('Migrating Roles...');
        const roles = await sqlite.role.findMany();
        for (const r of roles) {
            await prisma.role.upsert({
                where: { id: r.id },
                update: {},
                create: { ...r } // Prisma objects are compatible
            });
        }

        // 2. Users
        console.log('Migrating Users...');
        const users = await sqlite.user.findMany();
        for (const u of users) {
            await prisma.user.upsert({
                where: { id: u.id },
                update: {},
                create: { ...u }
            });
        }

        // 3. Events
        console.log('Migrating Events...');
        const events = await sqlite.event.findMany();
        for (const e of events) {
            await prisma.event.upsert({
                where: { id: e.id },
                update: {},
                create: { ...e }
            });
        }

        // 4. SpaceCategories
        console.log('Migrating SpaceCategories...');
        const cats = await sqlite.spaceCategory.findMany();
        for (const c of cats) {
            await prisma.spaceCategory.upsert({
                where: { id: c.id },
                update: {},
                create: { ...c }
            });
        }

        // 5. Spaces
        console.log('Migrating Spaces...');
        const spaces = await sqlite.space.findMany();
        for (const s of spaces) {
            await prisma.space.upsert({
                where: { id: s.id },
                update: {},
                create: { ...s }
            });
        }

        // 6. Exhibitors
        console.log('Migrating Exhibitors...');
        const exhibitors = await sqlite.exhibitor.findMany();
        for (const ex of exhibitors) {
            await prisma.exhibitor.upsert({
                where: { id: ex.id },
                update: {},
                create: { ...ex }
            });
        }

        // 7. Bookings
        console.log('Migrating Bookings...');
        const bookings = await sqlite.booking.findMany();
        for (const b of bookings) {
            await prisma.booking.upsert({
                where: { id: b.id },
                update: {},
                create: { ...b }
            });
        }

        // 8. Materials
        console.log('Migrating Materials...');
        const materials = await sqlite.material.findMany();
        for (const m of materials) {
            await prisma.material.upsert({
                where: { id: m.id },
                update: {},
                create: { ...m }
            });
        }

        // 8a. Material Items
        console.log('Migrating Material Items...');
        const matItems = await sqlite.materialItem.findMany();
        for (const mi of matItems) {
            await prisma.materialItem.upsert({
                where: { id: mi.id },
                update: {},
                create: { ...mi }
            });
        }

        // 8b. Electrical Items
        console.log('Migrating Electrical Items...');
        const elecItems = await sqlite.electricalItem.findMany();
        for (const ei of elecItems) {
            await prisma.electricalItem.upsert({
                where: { id: ei.id },
                update: {},
                create: { ...ei }
            });
        }

        // 8c. Sheds
        console.log('Migrating Sheds...');
        const sheds = await sqlite.shed.findMany();
        for (const s of sheds) {
            await prisma.shed.upsert({
                where: { id: s.id },
                update: {},
                create: { ...s }
            });
        }

        // 9. Allocations
        console.log('Migrating Material Allocations...');
        const matAllocs = await sqlite.materialAllocation.findMany();
        for (const ma of matAllocs) {
            await prisma.materialAllocation.upsert({
                where: { id: ma.id },
                update: {},
                create: { ...ma }
            });
        }

        console.log('Migrating Electrical Allocations...');
        const elecAllocs = await sqlite.electricalAllocation.findMany();
        for (const ea of elecAllocs) {
            await prisma.electricalAllocation.upsert({
                where: { id: ea.id },
                update: {},
                create: { ...ea }
            });
        }

        console.log('Migrating Shed Allocations...');
        const shedAllocs = await sqlite.shedAllocation.findMany();
        for (const sa of shedAllocs) {
            await prisma.shedAllocation.upsert({
                where: { id: sa.id },
                update: {},
                create: { ...sa }
            });
        }

        // 10. TicketTypes
        console.log('Migrating TicketTypes...');
        const tTypes = await sqlite.ticketType.findMany();
        for (const t of tTypes) {
            await prisma.ticketType.upsert({
                where: { id: t.id },
                update: {},
                create: { ...t }
            });
        }

        // 11. TicketInventory
        console.log('Migrating TicketInventory...');
        const tInv = await sqlite.ticketInventory.findMany();
        for (const t of tInv) {
            await prisma.ticketInventory.upsert({
                where: { id: t.id },
                update: {},
                create: { ...t }
            });
        }

        // 12. Staff
        console.log('Migrating Staff...');
        const staff = await sqlite.staff.findMany();
        for (const s of staff) {
            // Check if user exists if linked
            let userData = undefined;
            if (s.userId) {
                // Should already be migrated, but relationship needs strict ordering. User was migrated at step 2.
            }
            await prisma.staff.upsert({
                where: { id: s.id },
                update: {},
                create: { ...s }
            });
        }

        // 13. StaffTicketAssignment
        console.log('Migrating StaffTicketAssignments...');
        const sta = await sqlite.staffTicketAssignment.findMany();
        for (const s of sta) {
            await prisma.staffTicketAssignment.upsert({
                where: { id: s.id },
                update: {},
                create: { ...s }
            });
        }

        // 14. TicketSale
        console.log('Migrating TicketSales...');
        const tSales = await sqlite.ticketSale.findMany();
        for (const s of tSales) {
            await prisma.ticketSale.upsert({
                where: { id: s.id },
                update: {},
                create: { ...s }
            });
        }

        // 15. TicketSaleItem
        console.log('Migrating TicketSaleItems...');
        const tSaleItems = await sqlite.ticketSaleItem.findMany();
        const batchSize = 50;
        for (let i = 0; i < tSaleItems.length; i += batchSize) {
            const batch = tSaleItems.slice(i, i + batchSize);
            await prisma.ticketSaleItem.createMany({
                data: batch,
                skipDuplicates: true
            });
            // Small delay to be gentle
            await new Promise(r => setTimeout(r, 50));
        }

        // 16. Transactions (Accounts)
        console.log('Migrating Transactions...');
        const txs = await sqlite.transaction.findMany();
        for (const tx of txs) {
            await prisma.transaction.upsert({
                where: { id: tx.id },
                update: {},
                create: { ...tx }
            });
        }

        // 17. Invoices & Payments
        console.log('Migrating Invoices...');
        const invoices = await sqlite.invoice.findMany();
        for (const inv of invoices) {
            await prisma.invoice.upsert({
                where: { id: inv.id },
                update: {},
                create: { ...inv }
            });
        }

        console.log('Migrating Payments...');
        const payments = await sqlite.payment.findMany();
        for (const pay of payments) {
            await prisma.payment.upsert({
                where: { id: pay.id },
                update: {},
                create: { ...pay }
            });
        }

        console.log('Migration Completed Successfully!');
    } catch (e) {
        console.error('Migration Failed:', e);
    } finally {
        await prisma.$disconnect();
        await sqlite.$disconnect();
    }
}

migrate();
