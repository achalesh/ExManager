'use server';

import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const requestSchema = z.object({
    username: z.string().min(1, "Username is required"),
});

export async function requestPasswordReset(username: string) {
    try {
        const user = await prisma.user.findUnique({
            where: { username }
        });

        if (!user) {
            // Return success even if user not found to prevent enumeration
            // But for this internal app, maybe explicit error is better for UX?
            // "Contact Admin" suggests internal use. Let's be helpful.
            return { success: false, error: "User not found" };
        }

        // Check for existing pending request
        const existing = await prisma.passwordResetRequest.findFirst({
            where: {
                userId: user.id,
                status: 'PENDING'
            }
        });

        if (existing) {
            return { success: true, message: "Request already sent" };
        }

        await prisma.passwordResetRequest.create({
            data: {
                userId: user.id
            }
        });

        return { success: true };
    } catch (error) {
        console.error("Password Request Error:", error);
        return { success: false, error: "Failed to submit request" };
    }
}
