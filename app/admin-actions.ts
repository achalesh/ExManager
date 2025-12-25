'use server';

import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { getSession } from '@/lib/auth';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';

const createUserSchema = z.object({
    username: z.string().min(3, "Username must be at least 3 characters"),
    password: z.string().min(6, "Password must be at least 6 characters"),
    name: z.string().min(2, "Name must be at least 2 characters"),
    email: z.string().email("Invalid email address"),
    roleId: z.number().min(1, "Role is required"),
});

export async function createUser(data: z.infer<typeof createUserSchema>) {
    const session = await getSession();

    if (!session || session.roleName !== 'Admin') {
        return { success: false, error: 'Unauthorized' };
    }

    try {
        const parsed = createUserSchema.parse(data);

        // Check if username already exists
        const existingUser = await prisma.user.findUnique({
            where: { username: parsed.username }
        });

        if (existingUser) {
            return { success: false, error: 'Username already exists' };
        }

        // Check if email already exists
        const existingEmail = await prisma.user.findUnique({
            where: { email: parsed.email }
        });

        if (existingEmail) {
            return { success: false, error: 'Email already exists' };
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(parsed.password, 10);

        // Create user
        await prisma.user.create({
            data: {
                username: parsed.username,
                password: hashedPassword,
                name: parsed.name,
                email: parsed.email,
                roleId: parsed.roleId,
            }
        });

        revalidatePath('/dashboard/admin/users');
        return { success: true };
    } catch (error) {
        console.error('Error creating user:', error);
        return { success: false, error: 'Failed to create user' };
    }
}

export async function getUsers() {
    const session = await getSession();

    if (!session || session.roleName !== 'Admin') {
        return [];
    }

    return await prisma.user.findMany({
        include: {
            role: true,
        },
        orderBy: {
            createdAt: 'desc'
        }
    });
}

export async function getRoles() {
    const session = await getSession();

    if (!session || (session.roleName !== 'Admin' && session.roleName !== 'Manager')) {
        return [];
    }

    return await prisma.role.findMany({
        orderBy: {
            name: 'asc'
        }
    });
}

const roleSchema = z.object({
    name: z.string().min(2, "Role name must be at least 2 characters"),
    description: z.string().optional(),
    permissions: z.string().optional(), // JSON string implied
});

export async function createRole(data: z.infer<typeof roleSchema>) {
    const session = await getSession();
    if (!session || session.roleName !== 'Admin') {
        return { success: false, error: 'Unauthorized' };
    }

    try {
        const parsed = roleSchema.parse(data);

        const existing = await prisma.role.findUnique({ where: { name: parsed.name } });
        if (existing) return { success: false, error: 'Role name already exists' };

        await prisma.role.create({
            data: {
                name: parsed.name,
                description: parsed.description || "",
                permissions: parsed.permissions || "[]",
            }
        });

        revalidatePath('/dashboard/admin/roles');
        return { success: true };
    } catch (error) {
        console.error('Create Role Error:', error);
        return { success: false, error: 'Failed to create role' };
    }
}

export async function deleteRole(id: number) {
    const session = await getSession();
    if (!session || session.roleName !== 'Admin') {
        return { success: false, error: 'Unauthorized' };
    }

    try {
        // Prevent deleting critical roles
        const role = await prisma.role.findUnique({ where: { id } });
        if (role && ['Admin', 'Manager', 'User'].includes(role.name)) {
            return { success: false, error: 'Cannot delete system roles' };
        }

        // Check usage
        const userCount = await prisma.user.count({ where: { roleId: id } });
        if (userCount > 0) {
            return { success: false, error: `Cannot delete: ${userCount} users assigned to this role` };
        }

        await prisma.role.delete({ where: { id } });
        revalidatePath('/dashboard/admin/roles');
        return { success: true };
    } catch (error) {
        return { success: false, error: 'Failed to delete role' };
    }
}


const updateUserSchema = z.object({
    id: z.number(),
    username: z.string().min(3, "Username must be at least 3 characters"),
    name: z.string().min(2, "Name must be at least 2 characters"),
    email: z.string().email("Invalid email address"),
    roleId: z.number().min(1, "Role is required"),
});

export async function updateUser(data: z.infer<typeof updateUserSchema>) {
    const session = await getSession();
    if (!session || session.roleName !== 'Admin') {
        return { success: false, error: 'Unauthorized' };
    }

    try {
        const parsed = updateUserSchema.parse(data);

        // Check unique username (excluding self)
        const existingUser = await prisma.user.findFirst({
            where: {
                username: parsed.username,
                id: { not: parsed.id }
            }
        });
        if (existingUser) return { success: false, error: 'Username already taken' };

        // Check unique email
        const existingEmail = await prisma.user.findFirst({
            where: {
                email: parsed.email,
                id: { not: parsed.id }
            }
        });
        if (existingEmail) return { success: false, error: 'Email already in use' };

        await prisma.user.update({
            where: { id: parsed.id },
            data: {
                username: parsed.username,
                name: parsed.name,
                email: parsed.email,
                roleId: parsed.roleId,
            }
        });

        revalidatePath('/dashboard/admin/users');
        return { success: true };
    } catch (error) {
        console.error('Update User Error:', error);
        return { success: false, error: 'Failed to update user' };
    }
}

export async function deleteUser(id: number) {
    const session = await getSession();
    if (!session || session.roleName !== 'Admin') {
        return { success: false, error: 'Unauthorized' };
    }

    try {
        // Prevent self-delete
        if (session.userId === id) {
            return { success: false, error: 'Cannot delete your own account' };
        }

        await prisma.user.delete({ where: { id } });
        revalidatePath('/dashboard/admin/users');
        return { success: true };
    } catch (error) {
        console.error('Delete User Error:', error);
        return { success: false, error: 'Failed to delete user. They may have related records.' };
    }
}

export async function resetUserPassword(id: number, newPassword: string) {
    const session = await getSession();
    if (!session || session.roleName !== 'Admin') {
        return { success: false, error: 'Unauthorized' };
    }

    try {
        if (newPassword.length < 6) {
            return { success: false, error: 'Password must be at least 6 characters' };
        }

        const hashedPassword = await bcrypt.hash(newPassword, 10);
        await prisma.user.update({
            where: { id },
            data: { password: hashedPassword }
        });

        return { success: true };
    } catch (error) {
        console.error('Reset Password Error:', error);
        return { success: false, error: 'Failed to reset password' };
    }
}

export async function getPendingPasswordRequests() {
    const session = await getSession();
    if (!session || session.roleName !== 'Admin') return [];

    return await prisma.passwordResetRequest.findMany({
        where: { status: 'PENDING' },
        include: { user: true },
        orderBy: { createdAt: 'desc' }
    });
}

export async function resolvePasswordRequest(requestId: number) {
    const session = await getSession();
    if (!session || session.roleName !== 'Admin') return { success: false };

    await prisma.passwordResetRequest.update({
        where: { id: requestId },
        data: { status: 'RESOLVED' }
    });

    revalidatePath('/dashboard/admin/users');
    return { success: true };
}

export async function dismissPasswordRequest(requestId: number) {
    const session = await getSession();
    if (!session || session.roleName !== 'Admin') return { success: false };

    await prisma.passwordResetRequest.update({
        where: { id: requestId },
        data: { status: 'IGNORED' }
    });

    revalidatePath('/dashboard/admin/users');
    return { success: true };
}
