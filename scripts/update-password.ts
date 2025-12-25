
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

// Initialize Prisma
const prisma = new PrismaClient({
    datasources: {
        db: {
            url: "postgresql://neondb_owner:npg_AMSBFcZtVD08@ep-shy-block-a1mls7vu-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require"
        }
    }
});

async function main() {
    // Get password from arguments
    const newPassword = process.argv[2];
    const targetUser = process.argv[3] || 'admin';

    if (!newPassword) {
        console.error('\n❌ Please provide a new password.');
        console.log('Usage: npx tsx scripts/update-password.ts <new_password> [username]');
        process.exit(1);
    }

    try {
        console.log(`\nUpdating password for user: ${targetUser}...`);

        // Hash the new password
        const hashedPassword = await bcrypt.hash(newPassword, 10);

        // Update the user
        const user = await prisma.user.update({
            where: { username: targetUser },
            data: { password: hashedPassword }
        });

        console.log(`\n✅ Password successfully updated for '${user.username}'!`);
        console.log(`   ID: ${user.id}`);
        console.log(`   Email: ${user.email}`);

    } catch (e) {
        console.error('\n❌ Error updating password:', e);
    } finally {
        await prisma.$disconnect();
    }
}

main();
