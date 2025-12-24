import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
    console.log('Seeding database...');

    // Create default roles
    const adminRole = await prisma.role.upsert({
        where: { name: 'Admin' },
        update: {},
        create: {
            name: 'Admin',
            description: 'Full system access',
            permissions: JSON.stringify(['all']),
        },
    });

    const managerRole = await prisma.role.upsert({
        where: { name: 'Manager' },
        update: {},
        create: {
            name: 'Manager',
            description: 'Event management access',
            permissions: JSON.stringify(['manage_events', 'manage_bookings', 'view_reports']),
        },
    });

    const staffRole = await prisma.role.upsert({
        where: { name: 'Staff' },
        update: {},
        create: {
            name: 'Staff',
            description: 'Basic access',
            permissions: JSON.stringify(['view_events', 'create_bookings']),
        },
    });

    // Create default admin user
    const hashedPassword = await bcrypt.hash('admin123', 10);
    const adminUser = await prisma.user.upsert({
        where: { username: 'admin' },
        update: {},
        create: {
            username: 'admin',
            password: hashedPassword,
            name: 'System Administrator',
            email: 'admin@exmanager.local',
            roleId: adminRole.id,
        },
    });

    console.log('✓ Created roles:', { adminRole, managerRole, staffRole });
    console.log('✓ Created admin user:', { username: 'admin', password: 'admin123' });
    console.log('Database seeded successfully!');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
