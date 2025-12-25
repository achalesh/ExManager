import { PrismaClient } from '@prisma/client';

const globalForPrisma = global as unknown as { prisma: PrismaClient };

export const prisma =
    globalForPrisma.prisma ||
    new PrismaClient({
        log: ['query'],
        datasources: {
            db: {
                url: "postgresql://neondb_owner:npg_AMSBFcZtVD08@ep-shy-block-a1mls7vu-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require"
            }
        }
    });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
