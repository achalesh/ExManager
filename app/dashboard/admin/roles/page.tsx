import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';
import { getRoles } from '@/app/admin-actions';
import { CreateRoleDialog } from '@/components/dialogs/CreateRoleDialog';
import { DeleteRoleButton } from '@/components/shared/DeleteRoleButton';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { prisma } from '@/lib/prisma'; // Import prisma to get user counts? Or add user count to getRoles?

// Let's modify getRoles or just fetch here since it's a server component
async function getRolesWithCounts() {
    const roles = await prisma.role.findMany({
        include: {
            _count: {
                select: { users: true }
            }
        },
        orderBy: { name: 'asc' }
    });
    return roles;
}

export default async function CreateRolesPage() {
    const session = await getSession();

    if (!session) {
        redirect('/login');
    }

    if (session.roleName !== 'Admin') {
        redirect('/dashboard');
    }

    const roles = await getRolesWithCounts();

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Manage Roles</h1>
                    <p className="text-gray-600">Define access tiers for users.</p>
                </div>
                <CreateRoleDialog />
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Role Name</TableHead>
                            <TableHead>Description</TableHead>
                            <TableHead className="text-center">Users</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {roles.map((role) => (
                            <TableRow key={role.id}>
                                <TableCell className="font-medium">
                                    <div className="flex items-center gap-2">
                                        {role.name}
                                        {['Admin', 'Manager', 'Accountant', 'Staff'].includes(role.name) && (
                                            <Badge variant="secondary" className="text-xs">System</Badge>
                                        )}
                                    </div>
                                </TableCell>
                                <TableCell className="text-gray-500">{role.description || '-'}</TableCell>
                                <TableCell className="text-center">
                                    <Badge variant="outline">{role._count.users}</Badge>
                                </TableCell>
                                <TableCell className="text-right">
                                    {!['Admin', 'Manager'].includes(role.name) && (
                                        <DeleteRoleButton id={role.id} name={role.name} />
                                    )}
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
}
