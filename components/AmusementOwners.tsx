'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Plus, Edit2, Trash2, Loader2, Users } from 'lucide-react';
import { createAmusementOwner, updateAmusementOwner, deleteAmusementOwner, getAmusementOwners } from '@/app/amusement-actions';
import { useRouter } from 'next/navigation';

interface AmusementOwner {
    id: number;
    name: string;
    address: string;
    contactNumber: string;
    ticketTypes?: any[]; // Just for count
}

export function AmusementOwners() {
    const router = useRouter();
    const [owners, setOwners] = useState<AmusementOwner[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Dialog States
    const [isAddOpen, setIsAddOpen] = useState(false);
    const [editingOwner, setEditingOwner] = useState<AmusementOwner | null>(null);
    const [deletingId, setDeletingId] = useState<number | null>(null);
    const [formLoading, setFormLoading] = useState(false);

    // Form State
    const [formData, setFormData] = useState({
        name: '',
        address: '',
        contactNumber: ''
    });

    useEffect(() => {
        loadOwners();
    }, []);

    async function loadOwners() {
        setLoading(true);
        const res = await getAmusementOwners();
        if (res.success && res.data) {
            setOwners(res.data);
            setError(null);
        } else {
            setError(res.error || 'Failed to load owners');
        }
        setLoading(false);
    }

    const resetForm = () => {
        setFormData({ name: '', address: '', contactNumber: '' });
        setEditingOwner(null);
        setIsAddOpen(false);
    };

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        setFormLoading(true);
        const res = await createAmusementOwner(formData);
        if (res.success && res.data) {
            setOwners([...owners, res.data]);
            resetForm();
            router.refresh();
        } else {
            alert('Failed to create: ' + res.error);
        }
        setFormLoading(false);
    };

    const handleUpdate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingOwner) return;
        setFormLoading(true);

        const res = await updateAmusementOwner(editingOwner.id, formData);
        if (res.success && res.data) {
            setOwners(owners.map(o => o.id === editingOwner.id ? res.data! : o));
            resetForm();
            router.refresh();
        } else {
            alert('Failed to update: ' + res.error);
        }
        setFormLoading(false);
    };

    const handleDelete = async () => {
        if (!deletingId) return;
        setFormLoading(true);
        const res = await deleteAmusementOwner(deletingId);
        if (res.success) {
            setOwners(owners.filter(o => o.id !== deletingId));
            setDeletingId(null);
            router.refresh();
        } else {
            alert('Failed to delete: ' + res.error);
        }
        setFormLoading(false);
    };

    const startEdit = (owner: AmusementOwner) => {
        setEditingOwner(owner);
        setFormData({
            name: owner.name,
            address: owner.address,
            contactNumber: owner.contactNumber
        });
    };

    if (loading) return <div className="p-8 flex justify-center"><Loader2 className="animate-spin h-8 w-8 text-primary" /></div>;
    if (error) return <div className="p-8 text-red-500">Error: {error}</div>;

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                    <Users className="h-6 w-6 text-primary" />
                    <h2 className="text-2xl font-bold tracking-tight">Amusement Owners</h2>
                </div>
                <Button onClick={() => setIsAddOpen(true)} className="gap-2">
                    <Plus className="h-4 w-4" /> Add Owner
                </Button>
            </div>

            <div className="bg-white rounded-md border">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Name</TableHead>
                            <TableHead>Contact</TableHead>
                            <TableHead>Address</TableHead>
                            <TableHead>Amusements</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {owners.map(owner => (
                            <TableRow key={owner.id}>
                                <TableCell className="font-medium">{owner.name}</TableCell>
                                <TableCell>{owner.contactNumber || '-'}</TableCell>
                                <TableCell className="truncate max-w-[200px]">{owner.address || '-'}</TableCell>
                                <TableCell>
                                    {(() => {
                                        const directCount = owner.ticketTypes?.length || 0;
                                        // @ts-ignore - ticketShares is injected from server action
                                        const sharedCount = owner.ticketShares?.length || 0;
                                        const total = directCount + sharedCount;

                                        return total > 0
                                            ? <span className="inline-flex items-center rounded-full bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700 ring-1 ring-inset ring-blue-700/10">{total} rides</span>
                                            : <span className="text-muted-foreground text-xs">None</span>
                                    })()}
                                </TableCell>
                                <TableCell className="text-right">
                                    <div className="flex justify-end gap-2">
                                        <Button variant="ghost" size="icon" onClick={() => startEdit(owner)}>
                                            <Edit2 className="h-4 w-4 text-blue-600" />
                                        </Button>
                                        <Button variant="ghost" size="icon" onClick={() => setDeletingId(owner.id)}>
                                            <Trash2 className="h-4 w-4 text-red-600" />
                                        </Button>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>

            {/* Create Dialog */}
            <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Add Amusement Owner</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleCreate} className="space-y-4">
                        <div className="space-y-2">
                            <Label>Name</Label>
                            <Input
                                value={formData.name}
                                onChange={e => setFormData({ ...formData, name: e.target.value })}
                                placeholder="Owner Name"
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Contact Number</Label>
                            <Input
                                value={formData.contactNumber}
                                onChange={e => setFormData({ ...formData, contactNumber: e.target.value })}
                                placeholder="Phone"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Address</Label>
                            <Input
                                value={formData.address}
                                onChange={e => setFormData({ ...formData, address: e.target.value })}
                                placeholder="Address"
                            />
                        </div>
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={resetForm}>Cancel</Button>
                            <Button type="submit" disabled={formLoading}>
                                {formLoading && <Loader2 className="animate-spin mr-2 h-4 w-4" />}
                                Create Owner
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Edit Dialog */}
            <Dialog open={!!editingOwner} onOpenChange={(o) => !o && resetForm()}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Edit Amusement Owner</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleUpdate} className="space-y-4">
                        <div className="space-y-2">
                            <Label>Name</Label>
                            <Input
                                value={formData.name}
                                onChange={e => setFormData({ ...formData, name: e.target.value })}
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Contact Number</Label>
                            <Input
                                value={formData.contactNumber}
                                onChange={e => setFormData({ ...formData, contactNumber: e.target.value })}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Address</Label>
                            <Input
                                value={formData.address}
                                onChange={e => setFormData({ ...formData, address: e.target.value })}
                            />
                        </div>
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={resetForm}>Cancel</Button>
                            <Button type="submit" disabled={formLoading}>
                                {formLoading && <Loader2 className="animate-spin mr-2 h-4 w-4" />}
                                Save Changes
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Delete Alert */}
            <Dialog open={!!deletingId} onOpenChange={(o) => !o && setDeletingId(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Delete Owner?</DialogTitle>
                        <DialogDescription>
                            This will verify if the owner has any linked amusements before deleting.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setDeletingId(null)}>Cancel</Button>
                        <Button variant="destructive" onClick={handleDelete} disabled={formLoading}>
                            {formLoading && <Loader2 className="animate-spin mr-2 h-4 w-4" />}
                            Delete
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
