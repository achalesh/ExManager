'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { login } from '@/lib/auth';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';

export default function LoginPage() {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    // Reset Password State
    const [openReset, setOpenReset] = useState(false);
    const [resetUsername, setResetUsername] = useState('');
    const [resetLoading, setResetLoading] = useState(false);

    async function handleResetRequest(e: React.FormEvent) {
        e.preventDefault();
        setResetLoading(true);
        try {
            const { requestPasswordReset } = await import('@/app/password-actions');
            const result = await requestPasswordReset(resetUsername);
            if (result.success) {
                setOpenReset(false);
                setResetUsername('');
                alert('Request sent! An administrator will review your request.');
            } else {
                alert(result.error || 'Failed to send request');
            }
        } catch (error) {
            console.error(error);
            alert('Something went wrong');
        } finally {
            setResetLoading(false);
        }
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const result = await login(username, password);

            if (result.success) {
                router.push('/dashboard');
                router.refresh();
            } else {
                setError(result.error || 'Login failed');
            }
        } catch (err) {
            setError('An error occurred. Please try again.');
            console.error(err);
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
            <div className="w-full max-w-md">
                <div className="bg-white rounded-lg shadow-xl p-8">
                    <div className="text-center mb-8">
                        <h1 className="text-3xl font-bold text-gray-900 mb-2">
                            Event Manager
                        </h1>
                        <p className="text-gray-600">
                            Sign in to manage your events
                        </p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div>
                            <Label htmlFor="username">Username</Label>
                            <Input
                                id="username"
                                type="text"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                placeholder="Enter your username"
                                required
                                disabled={loading}
                                className="mt-1"
                            />
                        </div>


                        <div>
                            <div className="flex items-center justify-between">
                                <Label htmlFor="password">Password</Label>
                                <Button
                                    variant="link"
                                    className="px-0 font-normal h-auto text-sm text-indigo-600 hover:text-indigo-800"
                                    type="button"
                                    onClick={() => setOpenReset(true)}
                                >
                                    Forgot password?
                                </Button>
                            </div>
                            <Input
                                id="password"
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="Enter your password"
                                required
                                disabled={loading}
                                className="mt-1"
                            />
                        </div>

                        {error && (
                            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
                                {error}
                            </div>
                        )}

                        <Button
                            type="submit"
                            className="w-full"
                            disabled={loading}
                        >
                            {loading ? 'Signing in...' : 'Sign In'}
                        </Button>
                    </form>

                </div>
            </div >

            <Dialog open={openReset} onOpenChange={setOpenReset}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Reset Password</DialogTitle>
                        <DialogDescription>
                            Enter your username below. We will notify the administrator to reset your password.
                        </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleResetRequest}>
                        <div className="grid gap-4 py-4">
                            <div className="grid gap-2">
                                <Label htmlFor="reset-username">Username</Label>
                                <Input
                                    id="reset-username"
                                    value={resetUsername}
                                    onChange={(e) => setResetUsername(e.target.value)}
                                    placeholder="Enter your username"
                                    required
                                />
                            </div>
                        </div>
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setOpenReset(false)}>Cancel</Button>
                            <Button type="submit" disabled={resetLoading}>
                                {resetLoading ? 'Sending Request...' : 'Request Reset'}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </div >
    );
}
