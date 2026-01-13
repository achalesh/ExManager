'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { MoreHorizontal, Pencil, Trash2, Key } from 'lucide-react';
import { updateUser, deleteUser, resetUserPassword } from '@/app/admin-actions';
import { toast } from 'sonner';

interface UserActionsProps {
    user: any; // Using any for flexibility, but strictly it matches the Prisma return type
    roles: { id: number; name: string }[];
    currentUserId: number; // To prevent self-actions visually
}

export function UserActions({ user, roles, currentUserId }: UserActionsProps) {
    const router = useRouter();
    const [loading, setLoading] = useState(false);

    // Dialog States
    const [showEdit, setShowEdit] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [showDelete, setShowDelete] = useState(false);

    // Form States
    const [editData, setEditData] = useState({
        username: user.username,
        name: user.name,
        email: user.email,
        roleId: user.roleId,
    });
    const [newPassword, setNewPassword] = useState('');

    const isSelf = user.id === currentUserId;

    async function handleUpdate(e: React.FormEvent) {
        e.preventDefault();
        setLoading(true);
        try {
            const res = await updateUser({ id: user.id, ...editData });
            if (res.success) {
                toast.success('User updated successfully');
                setShowEdit(false);
                router.refresh();
            } else {
                toast.error(res.error || 'Failed to update user');
            }
        } catch (error) {
            toast.error('Something went wrong');
        } finally {
            setLoading(false);
        }
    }

    async function handlePasswordReset(e: React.FormEvent) {
        e.preventDefault();
        setLoading(true);
        try {
            const res = await resetUserPassword(user.id, newPassword);
            if (res.success) {
                toast.success('Password reset successfully');
                setShowPassword(false);
                setNewPassword('');
            } else {
                toast.error(res.error || 'Failed to reset password');
            }
        } catch (error) {
            toast.error('Something went wrong');
        } finally {
            setLoading(false);
        }
    }

    async function handleDelete() {
        setLoading(true);
        try {
            const res = await deleteUser(user.id);
            if (res.success) {
                toast.success('User deleted successfully');
                setShowDelete(false);
                router.refresh();
            } else {
                toast.error(res.error || 'Failed to delete user');
            }
        } catch (error) {
            toast.error('Something went wrong');
        } finally {
            setLoading(false);
        }
    }

    return (
        <>
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="h-8 w-8 p-0">
                        <span className="sr-only">Open menu</span>
                        <MoreHorizontal className="h-4 w-4" />
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                    <DropdownMenuLabel>Actions</DropdownMenuLabel>
                    <DropdownMenuItem onClick={() => setShowEdit(true)}>
                        <Pencil className="mr-2 h-4 w-4" /> Edit User
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setShowPassword(true)}>
                        <Key className="mr-2 h-4 w-4" /> Reset Password
                    </DropdownMenuItem>
                    <DropdownMenuItem
                        onClick={() => setShowDelete(true)}
                        className="text-red-600 focus:text-red-600"
                        disabled={isSelf}
                    >
                        <Trash2 className="mr-2 h-4 w-4" /> Delete User
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>

            {/* Edit Dialog */}
            <Dialog open={showEdit} onOpenChange={setShowEdit}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Edit User</DialogTitle>
                        <DialogDescription>Update user details and role.</DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleUpdate} className="space-y-4">
                        <div className="grid gap-2">
                            <Label htmlFor="name">Full Name</Label>
                            <Input
                                id="name"
                                value={editData.name}
                                onChange={e => setEditData({ ...editData, name: e.target.value })}
                                required
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="username">Username</Label>
                            <Input
                                id="username"
                                value={editData.username}
                                onChange={e => setEditData({ ...editData, username: e.target.value })}
                                required
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="email">Email</Label>
                            <Input
                                id="email"
                                value={editData.email}
                                onChange={e => setEditData({ ...editData, email: e.target.value })}
                                required
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="role">Role</Label>
                            <Select
                                value={editData.roleId.toString()}
                                onValueChange={val => setEditData({ ...editData, roleId: parseInt(val) })}
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {roles.map(role => (
                                        <SelectItem key={role.id} value={role.id.toString()}>{role.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setShowEdit(false)}>Cancel</Button>
                            <Button type="submit" disabled={loading}>Save Changes</Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Password Reset Dialog */}
            <Dialog open={showPassword} onOpenChange={setShowPassword}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Reset Password</DialogTitle>
                        <DialogDescription>
                            Set a new password for <strong>{user.username}</strong>.
                        </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handlePasswordReset} className="space-y-4">
                        <div className="grid gap-2">
                            <Label htmlFor="newpass">New Password</Label>
                            <Input
                                id="newpass"
                                type="text" // Visible for admin resetting it
                                value={newPassword}
                                onChange={e => setNewPassword(e.target.value)}
                                required
                                minLength={6}
                                placeholder="Enter new password"
                            />
                        </div>
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setShowPassword(false)}>Cancel</Button>
                            <Button type="submit" disabled={loading}>Update Password</Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Delete Confirmation */}
            <AlertDialog open={showDelete} onOpenChange={setShowDelete}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete User</AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you want to delete <strong>{user.name}</strong>? This action cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">
                            {loading ? 'Deleting...' : 'Delete'}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}
