

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

export * from './auth-actions';

// Authorization Helper
export function verifyRole(session: SessionData | null, allowedRoles: string[]): boolean {
    if (!session) return false;
    return allowedRoles.includes(session.roleName);
}

// Authorization Helper with Error
export function requireRole(session: SessionData | null, allowedRoles: string[]): asserts session is SessionData {
    if (!session) {
        throw new Error('Not authenticated');
    }
    if (!allowedRoles.includes(session.roleName)) {
        throw new Error('Unauthorized');
    }
}
