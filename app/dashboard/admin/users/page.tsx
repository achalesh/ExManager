import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';
import { getUsers, getRoles } from '@/app/admin-actions';
import { CreateUserDialog } from '@/components/CreateUserDialog';
import { Shield, Mail, Calendar } from 'lucide-react';
import { format } from 'date-fns';

export default async function CreateUserPage() {
    const session = await getSession();

    if (!session) {
        redirect('/login');
    }

    if (session.roleName !== 'Admin') {
        redirect('/dashboard');
    }

    const [users, roles] = await Promise.all([
        getUsers(),
        getRoles()
    ]);

    return (
        <div>
            <div className="mb-8 flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 mb-2">
                        User Management
                    </h1>
                    <p className="text-gray-600">
                        Create and manage system users
                    </p>
                </div>
                <CreateUserDialog roles={roles} />
            </div>

            <div className="bg-white rounded-lg shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    User
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Username
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Role
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Created
                                </th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {users.length === 0 ? (
                                <tr>
                                    <td colSpan={4} className="px-6 py-12 text-center text-gray-500">
                                        <Shield className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                                        <p>No users found</p>
                                    </td>
                                </tr>
                            ) : (
                                users.map((user) => (
                                    <tr key={user.id} className="hover:bg-gray-50">
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex items-center">
                                                <div className="flex-shrink-0 h-10 w-10 bg-indigo-100 rounded-full flex items-center justify-center">
                                                    <span className="text-indigo-700 font-semibold text-sm">
                                                        {user.name.charAt(0).toUpperCase()}
                                                    </span>
                                                </div>
                                                <div className="ml-4">
                                                    <div className="text-sm font-medium text-gray-900">
                                                        {user.name}
                                                    </div>
                                                    <div className="text-sm text-gray-500 flex items-center">
                                                        <Mail className="h-3 w-3 mr-1" />
                                                        {user.email}
                                                    </div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm text-gray-900 font-mono">
                                                {user.username}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${user.role.name === 'Admin'
                                                    ? 'bg-purple-100 text-purple-800'
                                                    : user.role.name === 'Manager'
                                                        ? 'bg-blue-100 text-blue-800'
                                                        : 'bg-green-100 text-green-800'
                                                }`}>
                                                {user.role.name}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            <div className="flex items-center">
                                                <Calendar className="h-4 w-4 mr-2" />
                                                {format(new Date(user.createdAt), 'MMM d, yyyy')}
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h3 className="text-sm font-semibold text-blue-900 mb-2">💡 Tip</h3>
                <p className="text-sm text-blue-800">
                    Create users with different roles to test role-based access control.
                    Manager users can access Settings, while Staff users only see main navigation.
                </p>
            </div>
        </div>
    );
}
