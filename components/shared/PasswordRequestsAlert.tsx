'use client';

import { useState } from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { ShieldAlert, Check, X } from 'lucide-react';
import { resolvePasswordRequest, dismissPasswordRequest, resetUserPassword } from '@/app/admin-actions';
import { toast } from 'sonner';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';

interface Request {
    id: number;
    user: {
        id: number;
        username: string;
        name: string;
    };
    createdAt: Date;
}

export function PasswordRequestsAlert({ requests }: { requests: Request[] }) {
    const [selectedRequest, setSelectedRequest] = useState<Request | null>(null);
    const [newPassword, setNewPassword] = useState('');
    const [loading, setLoading] = useState(false);

    if (requests.length === 0) return null;

    async function handleDismiss(id: number) {
        toast.loading('Dismissing request...');
        const result = await dismissPasswordRequest(id);
        if (result.success) {
            toast.success('Request dismissed');
        } else {
            toast.error('Failed to dismiss request');
        }
    }

    async function handleResetSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (!selectedRequest) return;

        setLoading(true);
        try {
            // 1. Reset Password
            const resetResult = await resetUserPassword(selectedRequest.user.id, newPassword);
            if (!resetResult.success) {
                toast.error(resetResult.error);
                setLoading(false);
                return;
            }

            // 2. Mark Request Resolved
            const resolveResult = await resolvePasswordRequest(selectedRequest.id);
            if (resolveResult.success) {
                toast.success(`Password reset for ${selectedRequest.user.username}`);
                setSelectedRequest(null);
                setNewPassword('');
            } else {
                toast.error('Password reset but failed to close request');
            }
        } catch (error) {
            toast.error('An error occurred');
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="mb-6 space-y-2">
            {requests.map((req) => (
                <Alert key={req.id} variant="destructive" className="bg-amber-50 border-amber-200 text-amber-900">
                    <ShieldAlert className="h-4 w-4 text-amber-600" />
                    <AlertTitle className="text-amber-800 font-semibold mb-1">
                        Password Reset Requested
                    </AlertTitle>
                    <AlertDescription className="flex items-center justify-between">
                        <span>
                            User <strong>{req.user.name}</strong> ({req.user.username}) requested a password reset.
                        </span>
                        <div className="flex gap-2">
                            <Button
                                size="sm"
                                variant="outline"
                                className="bg-white border-amber-300 hover:bg-amber-100 text-amber-900"
                                onClick={() => handleDismiss(req.id)}
                            >
                                <X className="h-3 w-3 mr-1" /> Dismiss
                            </Button>
                            <Button
                                size="sm"
                                className="bg-amber-600 hover:bg-amber-700 text-white border-none"
                                onClick={() => setSelectedRequest(req)}
                            >
                                <Check className="h-3 w-3 mr-1" /> Reset Now
                            </Button>
                        </div>
                    </AlertDescription>
                </Alert>
            ))}

            <Dialog open={!!selectedRequest} onOpenChange={(open) => !open && setSelectedRequest(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Reset Password for {selectedRequest?.user.name}</DialogTitle>
                        <DialogDescription>
                            Enter a new temporary password for <strong>{selectedRequest?.user.username}</strong>
                        </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleResetSubmit}>
                        <div className="space-y-4 py-4">
                            <div className="space-y-2">
                                <Label htmlFor="new-password">New Password</Label>
                                <Input
                                    id="new-password"
                                    type="text"
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
                                    placeholder="e.g. welcome123"
                                    required
                                    minLength={6}
                                />
                            </div>
                        </div>
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setSelectedRequest(null)}>
                                Cancel
                            </Button>
                            <Button type="submit" disabled={loading}>
                                {loading ? 'Resetting...' : 'Confirm Reset'}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    );
}
