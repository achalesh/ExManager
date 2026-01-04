'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { assignTicketsToStaff, settleStaffAssignment, undoStaffAssignment, assignTicketStock } from '@/app/ticketing-actions';
import { getUPIMachines } from '@/app/upi-actions';
import { useRouter } from 'next/navigation';
import { AlertCircle, IndianRupee, Users, Trash, ArrowRightLeft, Plus, Calendar, Download } from 'lucide-react';

interface TicketType {
    id: number;
    name: string;
    category: string;
    price: number;
    batches?: {
        id: number;
        currentNumber: number;
        endNumber: number;
        isActive: boolean;
    }[];
}

interface TicketInventory {
    id: number;
    seriesLabel: string;
    startNumber: number;
    endNumber: number;
    currentNumber: number;
    category: string;
    price: number;
    status: string;
}

interface Staff {
    id: number;
    name: string;
    department: string;
}

interface Assignment {
    id: number;
    staff: Staff;
    ticketType: TicketType;
    seriesLabel: string;
    startNumber: number;
    endNumber: number;
    assignedCount: number;
    status: string;
    assignedDate: Date;
    // Settlement
    soldCount?: number;
    returnedCount?: number;
    totalAmount?: number;
    returnDate?: Date | null;
}

export function StaffAllocationInterface({
    staffList,
    items,
    inventory,
    assignments
}: {
    staffList: Staff[],
    items: TicketType[],
    inventory: TicketInventory[],
    assignments: Assignment[]
}) {
    const [openAssign, setOpenAssign] = useState(false);
    const [openSettle, setOpenSettle] = useState(false);
    const [selectedAssignment, setSelectedAssignment] = useState<Assignment | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const router = useRouter();

    // Assignment Form State
    const [selectedStaff, setSelectedStaff] = useState<string>('');
    const [selectedItem, setSelectedItem] = useState<string>('');
    const [selectedStock, setSelectedStock] = useState<string>('');
    const [quantity, setQuantity] = useState<number>(0);

    // Counter Allocation State
    const [selectedItemForBatch, setSelectedItemForBatch] = useState<TicketType | null>(null);
    const [openAssignBatch, setOpenAssignBatch] = useState(false);
    const [loadingBatch, setLoadingBatch] = useState(false);

    // Backdating & UPI Override State
    const [upiMachines, setUpiMachines] = useState<any[]>([]);

    // Load UPI Machines on mount
    // Load UPI Machines on mount
    useEffect(() => {
        getUPIMachines().then(res => {
            if (res.success && res.data) setUpiMachines(res.data);
        });
    }, []);

    const handleAssignBatchClick = (item: TicketType) => {
        setSelectedItemForBatch(item);
        setOpenAssignBatch(true);
        setError('');
    };

    const handleBatchSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setLoadingBatch(true);
        setError('');

        const formData = new FormData(e.currentTarget);
        const inventoryId = Number(formData.get('inventoryId'));
        const quantity = Number(formData.get('quantity'));

        if (!selectedItemForBatch) return;

        const res = await assignTicketStock({
            ticketTypeId: selectedItemForBatch.id,
            inventoryId,
            quantity
        });

        if (res.success) {
            setOpenAssignBatch(false);
            router.refresh();
        } else {
            setError((res as any).error || 'Failed to assign stock');
        }
        setLoadingBatch(false);
    };

    // Filter compatible stock for Batch Allocation
    const compatibleStockBatch = selectedItemForBatch
        ? inventory.filter(inv =>
            inv.status === 'Available' &&
            inv.category === selectedItemForBatch.category &&
            inv.price === selectedItemForBatch.price
        )
        : [];


    const handleAssignSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        const formData = new FormData(e.currentTarget);

        const res = await assignTicketsToStaff({
            staffId: Number(formData.get('staffId')),
            ticketTypeId: Number(formData.get('ticketTypeId')),
            inventoryId: Number(formData.get('inventoryId')),
            quantity: Number(formData.get('quantity')),
            assignedDate: formData.get('assignedDate') as string,
            assignedUpiMachineId: formData.get('assignedUpiMachineId') ? Number(formData.get('assignedUpiMachineId')) : undefined
        });

        if (res.success) {
            setOpenAssign(false);
            router.refresh();
            // Reset form
            setSelectedStaff('');
            setSelectedItem('');
            setSelectedStock('');
            setQuantity(0);
        } else {
            setError((res as any).error || 'Failed to assign');
        }
        setLoading(false);
    };

    const handleSettleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!selectedAssignment) return;
        setLoading(true);
        setError('');

        const formData = new FormData(e.currentTarget);

        const res = await settleStaffAssignment({
            assignmentId: selectedAssignment.id,
            returnedCount: Number(formData.get('returnedCount')),
            cashReceived: Number(formData.get('cashReceived')),
            upiReceived: Number(formData.get('upiReceived')),
            returnDate: formData.get('returnDate') as string
        });

        if (res.success) {
            setOpenSettle(false);
            router.refresh();
        } else {
            setError(res.error || 'Failed to settle');
        }
        setLoading(false);
    };

    const handleUndo = async (assignmentId: number) => {
        if (!confirm('Are you sure you want to undo this allocation? This will restore the stock numbers.')) return;
        setLoading(true);
        const res = await undoStaffAssignment(assignmentId);
        if (res.success) {
            router.refresh();
        } else {
            alert((res as any).error || 'Failed to undo assignment');
        }
        setLoading(false);
    };

    const activeAssignments = assignments.filter(a => a.status === 'Assigned');
    const pastAssignments = assignments.filter(a => a.status === 'Returned');

    // Filter compatible stock for assignment
    const currentTicketType = items.find(i => i.id.toString() === selectedItem);
    const compatibleStock = currentTicketType
        ? inventory.filter(inv => inv.status === 'Available' && inv.category === currentTicketType.category && inv.price === currentTicketType.price)
        : [];

    const handleExportSettlements = () => {
        if (pastAssignments.length === 0) return;
        const headers = ['Staff Name', 'Item', 'Returned Date', 'Sold Count', 'Assigned Count', 'Total Amount', 'Status'];
        const csvContent = [
            headers.join(','),
            ...pastAssignments.map(a => [
                `"${a.staff.name}"`,
                `"${a.ticketType.name}"`,
                a.returnDate ? new Date(a.returnDate).toLocaleDateString('en-GB') : '-',
                a.soldCount,
                a.assignedCount,
                a.totalAmount,
                'Settled'
            ].join(','))
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `settlement_history_${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
    };

    const handleExportAllocations = () => {
        if (assignments.length === 0) return;
        const headers = ['Staff Name', 'Item', 'Assigned Date', 'Assigned Qty', 'Series', 'Status'];
        const csvContent = [
            headers.join(','),
            ...assignments.map(a => [
                `"${a.staff.name}"`,
                `"${a.ticketType.name}"`,
                new Date(a.assignedDate).toLocaleDateString('en-GB'),
                a.assignedCount,
                `"${a.seriesLabel} (${a.startNumber}-${a.endNumber})"`,
                a.status
            ].join(','))
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `allocation_history_${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center bg-white p-4 rounded-lg shadow-sm border">
                <div>
                    <h2 className="text-lg font-semibold flex items-center gap-2">
                        <Users className="h-5 w-5 text-indigo-600" /> Staff Allocation
                    </h2>
                    <p className="text-sm text-gray-500">Assign tickets to staff for manual selling</p>
                </div>
                <Button onClick={() => setOpenAssign(true)}>Assign New Bundle</Button>
            </div>

            <Tabs defaultValue="active">
                <TabsList>
                    <TabsTrigger value="active">Active Assignments ({activeAssignments.length})</TabsTrigger>
                    <TabsTrigger value="counter">Counter Allocation</TabsTrigger>
                    <TabsTrigger value="history">Settlement History</TabsTrigger>
                    <TabsTrigger value="all-history">Allocation History</TabsTrigger>
                </TabsList>

                <TabsContent value="counter">
                    <div className="border rounded-md bg-white">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Item Name</TableHead>
                                    <TableHead>Category</TableHead>
                                    <TableHead>Price</TableHead>
                                    <TableHead>Active Series</TableHead>
                                    <TableHead>Current Number</TableHead>
                                    <TableHead>Remaining</TableHead>
                                    <TableHead className="text-right">Action</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {items.map((item) => {
                                    const activeBatch = item.batches && item.batches.length > 0 ? item.batches[0] : null;
                                    const remaining = activeBatch ? activeBatch.endNumber - activeBatch.currentNumber + 1 : 0;

                                    return (
                                        <TableRow key={item.id}>
                                            <TableCell className="font-medium">{item.name}</TableCell>
                                            <TableCell>
                                                <Badge variant="outline">{item.category}</Badge>
                                            </TableCell>
                                            <TableCell>₹{item.price}</TableCell>
                                            <TableCell className="font-mono text-sm">
                                                {activeBatch ? (
                                                    <>
                                                        #{activeBatch.currentNumber} - #{activeBatch.endNumber}
                                                    </>
                                                ) : (
                                                    <span className="text-gray-400">No active batch</span>
                                                )}
                                            </TableCell>
                                            <TableCell>
                                                {activeBatch ? (
                                                    <span className="font-bold text-green-700">#{activeBatch.currentNumber}</span>
                                                ) : '-'}
                                            </TableCell>
                                            <TableCell>
                                                {activeBatch ? (
                                                    <Badge variant={remaining < 50 ? "destructive" : "secondary"}>
                                                        {remaining}
                                                    </Badge>
                                                ) : '-'}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <Button
                                                    size="sm"
                                                    variant="default"
                                                    onClick={() => handleAssignBatchClick(item)}
                                                    className="gap-2"
                                                >
                                                    <ArrowRightLeft className="h-4 w-4" />
                                                    Assign Stock
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    );
                                })}
                                {items.length === 0 && (
                                    <TableRow>
                                        <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                                            No ticket items found. Create items first.
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </TabsContent>

                <TabsContent value="active" className="space-y-4">
                    <div className="border rounded-md bg-white">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Staff Name</TableHead>
                                    <TableHead>Ticket Item</TableHead>
                                    <TableHead>Series / Range</TableHead>
                                    <TableHead>Assigned Qty</TableHead>
                                    <TableHead>Date</TableHead>
                                    <TableHead className="text-right">Action</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {activeAssignments.map(assign => (
                                    <TableRow key={assign.id}>
                                        <TableCell className="font-medium">{assign.staff.name}</TableCell>
                                        <TableCell>
                                            {assign.ticketType.name}
                                            <span className="text-xs text-gray-500 ml-1">({assign.ticketType.category})</span>
                                        </TableCell>
                                        <TableCell className="font-mono text-sm">
                                            {assign.seriesLabel} (#{assign.startNumber}-{assign.endNumber})
                                        </TableCell>
                                        <TableCell>{assign.assignedCount}</TableCell>
                                        <TableCell className="text-sm text-gray-500">
                                            {new Date(assign.assignedDate).toLocaleDateString('en-GB')}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                className="mr-2"
                                                title="Add Additional Bundle"
                                                onClick={() => {
                                                    setSelectedStaff(assign.staff.id.toString());
                                                    setSelectedItem(assign.ticketType.id.toString());
                                                    setQuantity(0);
                                                    setSelectedStock('');
                                                    setOpenAssign(true);
                                                }}
                                            >
                                                <Plus className="h-4 w-4" />
                                            </Button>
                                            <Button
                                                size="sm"
                                                onClick={() => {
                                                    setSelectedAssignment(assign);
                                                    setOpenSettle(true);
                                                }}
                                            >
                                                Settle
                                            </Button>
                                            <Button
                                                size="sm"
                                                variant="ghost"
                                                className="ml-2 text-red-500 hover:text-red-700 hover:bg-red-50"
                                                onClick={() => handleUndo(assign.id)}
                                                disabled={loading}
                                            >
                                                <Trash className="h-4 w-4" />
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                                {activeAssignments.length === 0 && (
                                    <TableRow>
                                        <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                                            No active staff assignments.
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </TabsContent>

                <TabsContent value="history">
                    <div className="flex justify-end mb-2">
                        <Button variant="outline" size="sm" onClick={handleExportSettlements} className="gap-2">
                            <Download className="h-4 w-4" /> Download CSV
                        </Button>
                    </div>
                    <div className="border rounded-md bg-white">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Staff Name</TableHead>
                                    <TableHead>Item</TableHead>
                                    <TableHead>Returned Date</TableHead>
                                    <TableHead>Sold / Total</TableHead>
                                    <TableHead>Amount</TableHead>
                                    <TableHead>Status</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {pastAssignments.map(assign => (
                                    <TableRow key={assign.id}>
                                        <TableCell className="font-medium">{assign.staff.name}</TableCell>
                                        <TableCell>{assign.ticketType.name}</TableCell>
                                        <TableCell className="text-sm text-gray-500">
                                            {assign.returnDate ? new Date(assign.returnDate).toLocaleDateString('en-GB') : '-'}
                                        </TableCell>
                                        <TableCell>
                                            {assign.soldCount} / {assign.assignedCount}
                                        </TableCell>
                                        <TableCell>₹{assign.totalAmount}</TableCell>
                                        <TableCell>
                                            <Badge variant="secondary">Settled</Badge>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                </TabsContent>

                <TabsContent value="all-history">
                    <div className="flex justify-end mb-2">
                        <Button variant="outline" size="sm" onClick={handleExportAllocations} className="gap-2">
                            <Download className="h-4 w-4" /> Download CSV
                        </Button>
                    </div>
                    <div className="border rounded-md bg-white">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Staff Name</TableHead>
                                    <TableHead>Item</TableHead>
                                    <TableHead>Assigned Date</TableHead>
                                    <TableHead>Assigned Qty</TableHead>
                                    <TableHead>Series</TableHead>
                                    <TableHead>Status</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {assignments.map(assign => (
                                    <TableRow key={assign.id}>
                                        <TableCell className="font-medium">{assign.staff.name}</TableCell>
                                        <TableCell>{assign.ticketType.name}</TableCell>
                                        <TableCell className="text-sm text-gray-500">
                                            {new Date(assign.assignedDate).toLocaleDateString('en-GB')}
                                        </TableCell>
                                        <TableCell>{assign.assignedCount}</TableCell>
                                        <TableCell className="font-mono text-sm">
                                            {assign.seriesLabel} (#{assign.startNumber}-{assign.endNumber})
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant={assign.status === 'Assigned' ? 'default' : 'secondary'}>{assign.status}</Badge>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                </TabsContent>
            </Tabs>

            {/* ASSIGN DIALOG */}
            <Dialog open={openAssign} onOpenChange={setOpenAssign}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Assign Tickets to Staff</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleAssignSubmit} className="space-y-4">
                        {error && (
                            <div className="bg-red-50 text-red-500 p-3 rounded-md text-sm flex items-center gap-2">
                                <AlertCircle className="h-4 w-4" /> {error}
                            </div>
                        )}

                        <div className="space-y-2">
                            <Label>Staff Member</Label>
                            <Select name="staffId" onValueChange={setSelectedStaff} value={selectedStaff} required>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select Staff" />
                                </SelectTrigger>
                                <SelectContent>
                                    {staffList.filter(s => s.department === 'Booking').map(s => (
                                        <SelectItem key={s.id} value={s.id.toString()}>{s.name} (Booking)</SelectItem>
                                    ))}
                                    {/* Show others in a group? Or just filter Booking? Usually Booking dept handles sales. */}
                                    {staffList.filter(s => s.department !== 'Booking').length > 0 && (
                                        <div className="border-t my-1"></div>
                                    )}
                                    {staffList.filter(s => s.department !== 'Booking').map(s => (
                                        <SelectItem key={s.id} value={s.id.toString()}>{s.name} ({s.department})</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label>Ticket Item</Label>
                            <Select name="ticketTypeId" onValueChange={setSelectedItem} value={selectedItem} required>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select Ticket" />
                                </SelectTrigger>
                                <SelectContent>
                                    {items.map(item => (
                                        <SelectItem key={item.id} value={item.id.toString()}>
                                            {item.name} (₹{item.price})
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label>Stock Bundle</Label>
                            <Select
                                name="inventoryId"
                                value={selectedStock}
                                onValueChange={(val) => {
                                    setSelectedStock(val);
                                    // Auto-populate quantity
                                    const stock = compatibleStock.find(s => s.id.toString() === val);
                                    if (stock) {
                                        const avail = stock.endNumber - stock.currentNumber + 1;
                                        setQuantity(avail);
                                    }
                                }}
                                disabled={!selectedItem}
                                required
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder={selectedItem ? "Select Stock" : "Select Item first"} />
                                </SelectTrigger>
                                <SelectContent>
                                    {compatibleStock.map(stock => {
                                        const avail = stock.endNumber - stock.currentNumber + 1;
                                        return (
                                            <SelectItem key={stock.id} value={stock.id.toString()}>
                                                {stock.seriesLabel} (#{stock.currentNumber}-{stock.endNumber}) - Qty: {avail}
                                            </SelectItem>
                                        );
                                    })}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label>Quantity</Label>
                            <Input
                                name="quantity"
                                type="number"
                                min="1"
                                max={quantity || undefined}
                                value={quantity || ''}
                                onChange={(e) => setQuantity(Number(e.target.value))}
                                required
                                placeholder="e.g. 50"
                                disabled={!selectedStock}
                            />
                            {quantity > 0 && (
                                <p className="text-xs text-gray-500">Max available: {compatibleStock.find(s => s.id.toString() === selectedStock)?.endNumber! - compatibleStock.find(s => s.id.toString() === selectedStock)?.currentNumber! + 1}</p>
                            )}
                        </div>

                        <div className="grid grid-cols-2 gap-4 border-t pt-4">
                            <div className="space-y-2">
                                <Label>Assignment Date</Label>
                                <div className="relative">
                                    <Calendar className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
                                    <Input
                                        name="assignedDate"
                                        type="date"
                                        className="pl-9"
                                        defaultValue={new Date().toISOString().split('T')[0]}
                                    />
                                </div>
                                <p className="text-xs text-gray-500">Defaults to Today if empty.</p>
                            </div>
                            <div className="space-y-2">
                                <Label>KPI / UPI Machine</Label>
                                <Select name="assignedUpiMachineId">
                                    <SelectTrigger>
                                        <SelectValue placeholder="Default (Auto)" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="0" className="text-gray-500">Default (from Ticket Type)</SelectItem>
                                        {upiMachines.map(m => (
                                            <SelectItem key={m.id} value={m.id.toString()}>
                                                {m.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <p className="text-xs text-gray-500">Override machine for past dates.</p>
                            </div>
                        </div>

                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setOpenAssign(false)}>Cancel</Button>
                            <Button type="submit" disabled={loading}>Assign</Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* SETTLE DIALOG */}
            <Dialog open={openSettle} onOpenChange={setOpenSettle}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Settle Assignment</DialogTitle>
                    </DialogHeader>
                    {selectedAssignment && (
                        <form onSubmit={handleSettleSubmit} className="space-y-4">
                            <div className="bg-gray-50 p-4 rounded-md space-y-2 text-sm">
                                <p><strong>Staff:</strong> {selectedAssignment.staff.name}</p>
                                <p><strong>Item:</strong> {selectedAssignment.ticketType.name} (₹{selectedAssignment.ticketType.price})</p>
                                <p><strong>Assigned:</strong> {selectedAssignment.assignedCount} tickets</p>
                                <p><strong>Range:</strong> #{selectedAssignment.startNumber} - #{selectedAssignment.endNumber}</p>
                            </div>

                            {error && (
                                <div className="bg-red-50 text-red-500 p-3 rounded-md text-sm">
                                    {error}
                                </div>
                            )}

                            <div className="space-y-2">
                                <Label>Returned Tickets Count</Label>
                                <Input
                                    name="returnedCount"
                                    type="number"
                                    min="0"
                                    max={selectedAssignment.assignedCount}
                                    defaultValue={0}
                                    required
                                    className="border-blue-200"
                                />
                                <p className="text-xs text-gray-500">How many unsold tickets were returned?</p>
                                <p className="text-xs text-gray-500">How many unsold tickets were returned?</p>
                            </div>

                            <div className="space-y-2">
                                <Label>Settlement Date</Label>
                                <div className="relative">
                                    <Calendar className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
                                    <Input
                                        name="returnDate"
                                        type="date"
                                        className="pl-9"
                                        defaultValue={selectedAssignment.assignedDate ? new Date(selectedAssignment.assignedDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]}
                                    />
                                </div>
                                <p className="text-xs text-gray-500">Date when money was collected.</p>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Cash Received</Label>
                                    <div className="relative">
                                        <IndianRupee className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
                                        <Input name="cashReceived" type="number" min="0" className="pl-9" required />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label>UPI Received</Label>
                                    <div className="relative">
                                        <IndianRupee className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
                                        <Input name="upiReceived" type="number" min="0" className="pl-9" defaultValue={0} />
                                    </div>
                                </div>
                            </div>

                            <DialogFooter>
                                <Button type="button" variant="outline" onClick={() => setOpenSettle(false)}>Cancel</Button>
                                <Button type="submit" disabled={loading}>Confirm Settlement</Button>
                            </DialogFooter>
                        </form>
                    )}
                </DialogContent>
            </Dialog>
            {/* COUNTER ASSIGN DIALOG (From AssignTicketsInterface) */}
            <Dialog open={openAssignBatch} onOpenChange={setOpenAssignBatch}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Assign Stock to {selectedItemForBatch?.name}</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleBatchSubmit} className="space-y-4">
                        {error && (
                            <div className="bg-red-50 text-red-500 p-3 rounded-md text-sm flex items-center gap-2">
                                <AlertCircle className="h-4 w-4" /> {error}
                            </div>
                        )}

                        <div className="p-3 bg-blue-50 text-blue-700 rounded-md text-sm mb-4">
                            Category: <strong>{selectedItemForBatch?.category}</strong>, Price: <strong>₹{selectedItemForBatch?.price}</strong>
                        </div>

                        <div className="space-y-2">
                            <Label>Select Stock Bundle</Label>
                            {compatibleStockBatch.length > 0 ? (
                                <Select name="inventoryId" required>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select available Series" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {compatibleStockBatch.map(stock => {
                                            const avail = stock.endNumber - stock.currentNumber + 1;
                                            return (
                                                <SelectItem key={stock.id} value={stock.id.toString()}>
                                                    {stock.seriesLabel} (#{stock.currentNumber}-{stock.endNumber}) - Qty: {avail}
                                                </SelectItem>
                                            );
                                        })}
                                    </SelectContent>
                                </Select>
                            ) : (
                                <div className="text-red-500 text-sm border border-red-200 bg-red-50 p-2 rounded">
                                    No compatible stock available! Please add stock with same Category and Price.
                                </div>
                            )}
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="quantity">Quantity to Assign</Label>
                            <Input
                                id="quantity"
                                name="quantity"
                                type="number"
                                min="1"
                                placeholder="e.g. 100"
                                required
                                disabled={compatibleStockBatch.length === 0}
                            />
                            <p className="text-xs text-gray-500">
                                Enter the number of tickets to issue to the counter.
                            </p>
                        </div>

                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setOpenAssignBatch(false)}>
                                Cancel
                            </Button>
                            <Button type="submit" disabled={loadingBatch || compatibleStockBatch.length === 0}>
                                {loadingBatch ? 'Assigning...' : 'Confirm Assignment'}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    );
}
