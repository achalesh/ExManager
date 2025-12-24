import { SessionData } from './auth';

// Check if user has permission
export function hasPermission(session: SessionData | null, permission: string): boolean {
    if (!session) return false;
    if (session.roleName === 'Admin') return true;
    // Add more permission logic here based on role permissions
    return false;
}
