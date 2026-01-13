'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Loader2, Save, RefreshCw } from 'lucide-react';
import { getAllTicketTypesWithMachine, updateTicketMachineAssignment, getUPIMachines } from '@/app/upi-actions';
import { toast } from 'sonner';

export function TicketMachineAssignment() {
    const [tickets, setTickets] = useState<any[]>([]);
    const [machines, setMachines] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [updating, setUpdating] = useState<number | null>(null);

    useEffect(() => {
        loadData();
    }, []);

    async function loadData() {
        setLoading(true);
        const [ticketsRes, machinesRes] = await Promise.all([
            getAllTicketTypesWithMachine(),
            getUPIMachines()
        ]);

        if (ticketsRes.success) setTickets(ticketsRes.data || []);
        if (machinesRes.success) setMachines(machinesRes.data || []);
        setLoading(false);
    }

    async function handleAssignmentChange(ticketId: number, machineIdString: string) {
        const machineId = machineIdString === 'none' ? null : parseInt(machineIdString);
        setUpdating(ticketId);

        // Optimistic update
        const prevTickets = [...tickets];
        setTickets(tickets.map(t =>
            t.id === ticketId
                ? { ...t, upiMachineId: machineId, upiMachine: machines.find(m => m.id === machineId) || null }
                : t
        ));

        const res = await updateTicketMachineAssignment(ticketId, machineId);

        if (!res.success) {
            // Revert
            setTickets(prevTickets);
            toast.error('Failed to update assignment');
        } else {
            toast.success('Assignment updated');
        }
        setUpdating(null);
    }

    const companyMachines = machines.filter(m => m.isCompanyOwned);
    const externalMachines = machines.filter(m => !m.isCompanyOwned);

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-lg font-semibold">Daily Assignments</h2>
                    <p className="text-sm text-muted-foreground">Map Ticket Types/Counters to active UPI Machines.</p>
                </div>
                <Button variant="outline" size="sm" onClick={loadData} disabled={loading}>
                    <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                    Refresh
                </Button>
            </div>

            <div className="border rounded-md bg-white">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Ticket / Item Name</TableHead>
                            <TableHead>Category</TableHead>
                            <TableHead>Event</TableHead>
                            <TableHead>Price</TableHead>
                            <TableHead>Assigned UPI Machine</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {tickets.map(ticket => (
                            <TableRow key={ticket.id}>
                                <TableCell className="font-medium">
                                    {ticket.name}
                                </TableCell>
                                <TableCell>
                                    <Badge variant="outline">{ticket.category}</Badge>
                                </TableCell>
                                <TableCell className="text-sm text-gray-500">
                                    {ticket.event?.name}
                                </TableCell>
                                <TableCell>₹{ticket.price}</TableCell>
                                <TableCell>
                                    <div className="flex items-center gap-2">
                                        <Select
                                            value={ticket.upiMachineId?.toString() || 'none'}
                                            onValueChange={(val) => handleAssignmentChange(ticket.id, val)}
                                            disabled={updating === ticket.id}
                                        >
                                            <SelectTrigger className="w-[280px]">
                                                <SelectValue placeholder="Select Machine" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="none" className="text-gray-500">None</SelectItem>

                                                {companyMachines.length > 0 && (
                                                    <>
                                                        <div className="px-2 py-1.5 text-xs font-semibold text-gray-400 bg-gray-50">Company Machines</div>
                                                        {companyMachines.map(m => (
                                                            <SelectItem key={m.id} value={m.id.toString()}>
                                                                {m.name} ({m.provider})
                                                            </SelectItem>
                                                        ))}
                                                    </>
                                                )}

                                                {externalMachines.length > 0 && (
                                                    <>
                                                        <div className="px-2 py-1.5 text-xs font-semibold text-gray-400 bg-gray-50">Amusements / External</div>
                                                        {externalMachines.map(m => (
                                                            <SelectItem key={m.id} value={m.id.toString()}>
                                                                {m.name} - {m.amusementOwner?.name}
                                                            </SelectItem>
                                                        ))}
                                                    </>
                                                )}
                                            </SelectContent>
                                        </Select>
                                        {updating === ticket.id && <Loader2 className="h-4 w-4 animate-spin text-gray-400" />}
                                    </div>
                                </TableCell>
                            </TableRow>
                        ))}
                        {tickets.length === 0 && !loading && (
                            <TableRow>
                                <TableCell colSpan={5} className="text-center py-8 text-gray-500">
                                    No active ticket types found.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
}
