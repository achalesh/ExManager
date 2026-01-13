const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const users = await prisma.user.findMany({
        include: { role: true }
    });
    console.log("Users and Roles:");
    users.forEach(u => {
        console.log(`${u.username} - Role: ${u.role.name} (ID: ${u.roleId})`);
    });

    const roles = await prisma.role.findMany();
    console.log("\nAll Roles:");
    roles.forEach(r => console.log(`${r.name} (ID: ${r.id})`));
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
