'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogFooter,
} from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Plus, Edit, Trash2, Loader2, QrCode } from 'lucide-react';
import { getUPIMachines, createUPIMachine, updateUPIMachine, deleteUPIMachine } from '@/app/upi-actions';
import { getAmusementOwners } from '@/app/amusement-actions';

export function UPIMachinesClient() {
    const [machines, setMachines] = useState<any[]>([]);
    const [owners, setOwners] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingMachine, setEditingMachine] = useState<any>(null);

    // Form State
    const [name, setName] = useState('');
    const [provider, setProvider] = useState('');
    const [terminalId, setTerminalId] = useState('');
    const [isCompanyOwned, setIsCompanyOwned] = useState(true);
    const [amusementOwnerId, setAmusementOwnerId] = useState<string>('');

    useEffect(() => {
        loadData();
    }, []);

    async function loadData() {
        setLoading(true);
        const [machinesRes, ownersRes] = await Promise.all([
            getUPIMachines(),
            getAmusementOwners()
        ]);

        if (machinesRes.success) setMachines(machinesRes.data || []);
        if (ownersRes.success) setOwners(ownersRes.data || []);
        setLoading(false);
    }

    function openCreate() {
        setEditingMachine(null);
        setName('');
        setProvider('');
        setTerminalId('');
        setIsCompanyOwned(true);
        setAmusementOwnerId('');
        setIsDialogOpen(true);
    }

    function openEdit(machine: any) {
        setEditingMachine(machine);
        setName(machine.name);
        setProvider(machine.provider);
        setTerminalId(machine.terminalId || '');
        setIsCompanyOwned(machine.isCompanyOwned);
        setAmusementOwnerId(machine.amusementOwnerId?.toString() || '');
        setIsDialogOpen(true);
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();

        const payload = {
            name,
            provider,
            terminalId: terminalId || undefined,
            isCompanyOwned,
            amusementOwnerId: isCompanyOwned ? null : (amusementOwnerId ? parseInt(amusementOwnerId) : null)
        };

        if (!isCompanyOwned && !payload.amusementOwnerId) {
            alert("Error: Amusement Owner is required for external machines.");
            return;
        }

        let res;
        if (editingMachine) {
            res = await updateUPIMachine(editingMachine.id, payload);
        } else {
            res = await createUPIMachine(payload);
        }

        if (res.success) {
            // alert("Success: Machine saved.");
            setIsDialogOpen(false);
            loadData();
        } else {
            alert("Error: " + res.error);
        }
    }

    async function handleDelete(id: number) {
        if (!confirm('Are you sure you want to delete this machine?')) return;
        const res = await deleteUPIMachine(id);
        if (res.success) {
            loadData();
        } else {
            alert("Error: " + res.error);
        }
    }

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <Button onClick={openCreate} className="gap-2">
                    <Plus className="h-4 w-4" /> Add Machine
                </Button>
            </div>

            {loading ? (
                <div className="flex justify-center p-8"><Loader2 className="animate-spin" /></div>
            ) : (
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Name</TableHead>
                            <TableHead>Provider</TableHead>
                            <TableHead>Ownership</TableHead>
                            <TableHead>Terminal ID</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {machines.map(m => (
                            <TableRow key={m.id}>
                                <TableCell className="font-medium flex items-center gap-2">
                                    <QrCode className="h-4 w-4 text-gray-500" />
                                    {m.name}
                                </TableCell>
                                <TableCell>{m.provider}</TableCell>
                                <TableCell>
                                    <span className={`px-2 py-1 rounded-full text-xs ${m.isCompanyOwned ? 'bg-green-100 text-green-700' : 'bg-purple-100 text-purple-700'}`}>
                                        {m.isCompanyOwned ? 'Company' : `Owner: ${m.amusementOwner?.name}`}
                                    </span>
                                </TableCell>
                                <TableCell>{m.terminalId || '-'}</TableCell>
                                <TableCell className="text-right space-x-2">
                                    <Button variant="ghost" size="icon" onClick={() => openEdit(m)}>
                                        <Edit className="h-4 w-4" />
                                    </Button>
                                    <Button variant="ghost" size="icon" className="text-red-500 hover:text-red-700" onClick={() => handleDelete(m.id)}>
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            )}

            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{editingMachine ? 'Edit Machine' : 'Add UPI Machine'}</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="grid gap-2">
                            <Label>Name</Label>
                            <Input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Gate 1 QR" required />
                        </div>
                        <div className="grid gap-2">
                            <Label>Provider</Label>
                            <Select value={provider} onValueChange={setProvider}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select Provider" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="PhonePe">PhonePe</SelectItem>
                                    <SelectItem value="Paytm">Paytm</SelectItem>
                                    <SelectItem value="GPay">GPay</SelectItem>
                                    <SelectItem value="BHIM">BHIM</SelectItem>
                                    <SelectItem value="Other">Other</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="flex items-center justify-between border rounded-lg p-3">
                            <Label>Company Owned?</Label>
                            <Switch checked={isCompanyOwned} onCheckedChange={setIsCompanyOwned} />
                        </div>

                        {!isCompanyOwned && (
                            <div className="grid gap-2">
                                <Label>Amusement Owner</Label>
                                <Select value={amusementOwnerId} onValueChange={setAmusementOwnerId}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select Owner" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {owners.map(o => (
                                            <SelectItem key={o.id} value={o.id.toString()}>
                                                {o.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        )}

                        <div className="grid gap-2">
                            <Label>Terminal / Store ID (Optional)</Label>
                            <Input value={terminalId} onChange={e => setTerminalId(e.target.value)} placeholder="For CSV Matching" />
                        </div>

                        <DialogFooter>
                            <Button type="submit">Save Machine</Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    );
}
