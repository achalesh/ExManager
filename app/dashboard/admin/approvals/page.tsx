'use client';

import { useState, useEffect } from 'react';
import { getPendingRequests, approveRequest, rejectRequest } from '@/app/approval-actions';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, Check, X, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

interface ApprovalRequest {
    id: number;
    type: 'UPDATE' | 'DELETE';
    resource: string;
    resourceId: string;
    data: string;
    reason: string | null;
    status: string;
    createdAt: Date;
    requester: {
        name: string;
        email: string;
        role: { name: string }
    };
}

export default function ApprovalsPage() {
    const [requests, setRequests] = useState<ApprovalRequest[]>([]);
    const [loading, setLoading] = useState(true);
    const [processing, setProcessing] = useState<number | null>(null);

    async function loadRequests() {
        setLoading(true);
        const res = await getPendingRequests();
        if (res.success && res.data) {
            setRequests(res.data as any);
        }
        setLoading(false);
    }

    useEffect(() => {
        loadRequests();
    }, []);

    async function handleApprove(id: number) {
        setProcessing(id);
        const res = await approveRequest(id);
        if (res.success) {
            toast.success('Request approved');
            setRequests(prev => prev.filter(r => r.id !== id));
        } else {
            toast.error(res.error || 'Failed to approve');
        }
        setProcessing(null);
    }

    async function handleReject(id: number) {
        setProcessing(id);
        const res = await rejectRequest(id);
        if (res.success) {
            toast.info('Request rejected');
            setRequests(prev => prev.filter(r => r.id !== id));
        } else {
            toast.error('Failed to reject');
        }
        setProcessing(null);
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Pending Approvals</h1>
                    <p className="text-gray-500">Review changes requested by Managers and Accounts.</p>
                </div>
                <Button onClick={loadRequests} variant="outline" size="sm">
                    Refresh
                </Button>
            </div>

            {loading ? (
                <div className="flex justify-center p-12">
                    <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
                </div>
            ) : requests.length === 0 ? (
                <Card>
                    <CardContent className="flex flex-col items-center justify-center py-12 text-gray-500">
                        <Check className="h-12 w-12 text-green-500 mb-4 bg-green-50 p-2 rounded-full" />
                        <h3 className="text-lg font-medium">All Caught Up!</h3>
                        <p>No pending approval requests.</p>
                    </CardContent>
                </Card>
            ) : (
                <div className="grid gap-4">
                    {requests.map(req => {
                        const data = JSON.parse(req.data);
                        return (
                            <Card key={req.id} className="border-l-4 border-l-yellow-500 shadow-sm">
                                <CardHeader className="pb-2">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <div className="flex items-center gap-2 mb-1">
                                                <Badge variant={req.type === 'DELETE' ? 'destructive' : 'default'}>
                                                    {req.type}
                                                </Badge>
                                                <Badge variant="outline">{req.resource}</Badge>
                                                <span className="text-xs text-gray-500 font-mono">ID: {req.resourceId}</span>
                                            </div>
                                            <CardTitle className="text-base font-medium">
                                                {req.resource} {req.type === 'DELETE' ? 'Deletion' : 'Update'}
                                            </CardTitle>
                                            <CardDescription>
                                                Requested by <strong>{req.requester.name}</strong> ({req.requester.role.name})
                                            </CardDescription>
                                        </div>
                                        <div className="text-xs text-gray-400">
                                            {new Date(req.createdAt).toLocaleString()}
                                        </div>
                                    </div>
                                </CardHeader>
                                <CardContent>
                                    <div className="bg-gray-50 p-3 rounded-md text-sm font-mono mb-4 overflow-x-auto">
                                        <pre>{JSON.stringify(data, null, 2)}</pre>
                                    </div>

                                    {req.reason && (
                                        <div className="mb-4 text-sm bg-yellow-50 p-2 rounded-md border border-yellow-100 text-yellow-800 flex gap-2">
                                            <AlertCircle className="h-4 w-4 mt-0.5" />
                                            <span>Reason: {req.reason}</span>
                                        </div>
                                    )}

                                    <div className="flex justify-end gap-3">
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => handleReject(req.id)}
                                            disabled={processing === req.id}
                                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                        >
                                            {processing === req.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <X className="h-4 w-4 mr-1" />}
                                            Reject
                                        </Button>
                                        <Button
                                            size="sm"
                                            onClick={() => handleApprove(req.id)}
                                            disabled={processing === req.id}
                                            className="bg-green-600 hover:bg-green-700"
                                        >
                                            {processing === req.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4 mr-1" />}
                                            Approve
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
