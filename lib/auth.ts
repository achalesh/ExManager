'use server';

import { cookies } from 'next/headers';
import { prisma } from './prisma';
import bcrypt from 'bcryptjs';
import { randomBytes } from 'crypto';

export interface SessionData {
    userId: number;
    username: string;
    name: string;
    email: string;
    roleId: number;
    roleName: string;
    activeEventId: number | null;
    activeEventName: string | null;
    activeEventAddress: string | null;
    activeEventLogo: string | null;
}

// Generate a secure random token
function generateToken(): string {
    return randomBytes(32).toString('hex');
}

// Get current session from cookie
export async function getSession(): Promise<SessionData | null> {
    const cookieStore = await cookies();
    const token = cookieStore.get('session_token')?.value;

    if (!token) {
        return null;
    }

    const session = await prisma.session.findUnique({
        where: { token },
        include: {
            user: {
                include: {
                    role: true,
                },
            },
            activeEvent: true,
        },
    });

    if (!session || session.expiresAt < new Date()) {
        // Session expired, delete it
        if (session) {
            await prisma.session.delete({ where: { id: session.id } });
        }
        return null;
    }

    return {
        userId: session.user.id,
        username: session.user.username,
        name: session.user.name,
        email: session.user.email,
        roleId: session.user.roleId,
        roleName: session.user.role.name,
        activeEventId: session.activeEventId,
        activeEventName: session.activeEvent?.name || null,
        activeEventAddress: session.activeEvent?.location || null,
        activeEventLogo: session.activeEvent?.logo || null,
    };
}

// Login function
export async function login(username: string, password: string): Promise<{ success: boolean; error?: string }> {
    const user = await prisma.user.findUnique({
        where: { username },
        include: { role: true },
    });

    if (!user) {
        return { success: false, error: 'Invalid username or password' };
    }

    const passwordMatch = await bcrypt.compare(password, user.password);

    if (!passwordMatch) {
        return { success: false, error: 'Invalid username or password' };
    }

    // Create session
    const token = generateToken();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days

    await prisma.session.create({
        data: {
            userId: user.id,
            token,
            expiresAt,
        },
    });

    // Set cookie
    const cookieStore = await cookies();
    cookieStore.set('session_token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        expires: expiresAt,
        path: '/',
    });

    return { success: true };
}

// Logout function
export async function logout(): Promise<void> {
    const cookieStore = await cookies();
    const token = cookieStore.get('session_token')?.value;

    if (token) {
        await prisma.session.deleteMany({ where: { token } });
        cookieStore.delete('session_token');
    }
}

// Set active event for session
export async function setActiveEvent(eventId: number): Promise<{ success: boolean; error?: string }> {
    const session = await getSession();

    if (!session) {
        return { success: false, error: 'Not authenticated' };
    }

    const cookieStore = await cookies();
    const token = cookieStore.get('session_token')?.value;

    if (!token) {
        return { success: false, error: 'No session token' };
    }

    await prisma.session.updateMany({
        where: { token },
        data: { activeEventId: eventId },
    });

    return { success: true };
}


