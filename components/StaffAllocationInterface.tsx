'use client';

import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
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
import { assignTicketsToStaff, settleStaffAssignment, undoStaffAssignment, assignTicketStock, updateStaffAssignment, undoSettlement, finalizeStaffSettlement } from '@/app/ticketing-actions';
import { getUPIMachines } from '@/app/upi-actions';
import { useRouter } from 'next/navigation';
import { Plus, ArrowRightLeft, Users, AlertCircle, Download, Pencil, Trash2, Calendar, IndianRupee, RotateCcw, CheckCircle, FileText } from 'lucide-react';

interface TicketType {
    id: number;
    name: string;
    category: string;
    price: number;
    upiMachine?: {
        name: string;
    };
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
    assignedUpiMachineId?: number | null; // Added field for edit
    // Settlement
    soldCount?: number;
    returnedCount?: number;
    totalAmount?: number;
    // Settlement
    soldCount?: number;
    returnedCount?: number;
    totalAmount?: number;
    returnDate?: Date | null;
}

interface GroupedAssignment {
    key: string;
    staffId: number;
    staffName: string;
    ticketTypeId: number;
    ticketTypeName: string;
    ticketCategory: string;
    ticketPrice: number;
    assignedDate: string;
    totalAssigned: number;
    ids: number[];
    seriesLabels: string[];
    assignments: Assignment[];
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
    // Helper for max date
    const todayStr = new Date().toISOString().split('T')[0];

    const [openAssign, setOpenAssign] = useState(false);
    const [openSettle, setOpenSettle] = useState(false);
    const [openEdit, setOpenEdit] = useState(false);
    const [selectedAssignment, setSelectedAssignment] = useState<Assignment | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    // Settle Logic States
    const [returnCount, setReturnCount] = useState<number>(0);

    // Reset settle states when dialog opens/assignment changes
    useEffect(() => {
        setReturnCount(0);
    }, [selectedAssignment]);

    const handleFirstReturnChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!selectedAssignment) return;
        const startNum = Number(e.target.value);
        if (!startNum) return;

        // Count = End - Start + 1
        // Example: 100 to 200. Return 191 to 200.
        // Count = 200 - 191 + 1 = 10.
        const calculatedCount = selectedAssignment.endNumber - startNum + 1;

        if (calculatedCount >= 0 && calculatedCount <= selectedAssignment.assignedCount) {
            setReturnCount(calculatedCount);
        }
    };
    const router = useRouter();

    // Assignment Form State
    const [selectedStaff, setSelectedStaff] = useState<string>('');
    const [selectedItem, setSelectedItem] = useState<string>('');
    const [selectedStock, setSelectedStock] = useState<string>('');
    const [quantity, setQuantity] = useState<number>(0);

    // Counter Allocation State
    // Counter Allocation State
    const [selectedItemForBatch, setSelectedItemForBatch] = useState<TicketType | null>(null);
    const [openAssignBatch, setOpenAssignBatch] = useState(false);
    const [loadingBatch, setLoadingBatch] = useState(false);

    // Bulk ASSIGN State
    // Bulk ASSIGN Queue State
    const [openBulkAssign, setOpenBulkAssign] = useState(false);

    // Header State
    const [queueDate, setQueueDate] = useState(todayStr);
    const [queueUpiMachine, setQueueUpiMachine] = useState('0'); // 0=Auto, -1=Nil

    // Row Input State
    const [queueStaff, setQueueStaff] = useState('');
    const [queueItem, setQueueItem] = useState('');
    const [queueInventoryId, setQueueInventoryId] = useState('');

    // The Queue
    interface PendingAssignment {
        tempId: number;
        staffId: number;
        staffName: string;
        ticketTypeId: number;
        ticketTypeName: string;
        inventoryId: number;
        seriesLabel: string;
        quantity: number; // calculated from stock
        assignedDate: string;
        upiMachineId?: number; // defaulting to auto (undefined) for now, or add UI
    }
    const [pendingAssignments, setPendingAssignments] = useState<PendingAssignment[]>([]);

    const [bulkAssignLoading, setBulkAssignLoading] = useState(false);
    const [bulkAssignError, setBulkAssignError] = useState('');

    // Filter stock for Queue Input
    const queueCompatibleStock = queueItem
        ? inventory.filter(inv => {
            const type = items.find(i => i.id.toString() === queueItem);
            // Must be available AND not already in queue
            const inQueue = pendingAssignments.some(p => p.inventoryId === inv.id);
            if (inQueue || !type || inv.status !== 'Available') return false;

            // Relaxed rule for Entrance
            if (type.category === 'Entrance' && inv.category === 'Entrance') return true;

            // Strict for others
            return inv.category === type.category && inv.price === type.price;
        })
        : [];

    const handleAddToQueue = () => {
        if (!queueStaff || !queueItem || !queueInventoryId) return;

        const staff = staffList.find(s => s.id.toString() === queueStaff);
        const item = items.find(i => i.id.toString() === queueItem);
        const inv = inventory.find(i => i.id.toString() === queueInventoryId);

        if (!staff || !item || !inv) return;

        const qty = inv.currentNumber <= inv.endNumber ? (inv.endNumber - inv.currentNumber + 1) : 0;

        const newAssignment: PendingAssignment = {
            tempId: Date.now(),
            staffId: staff.id,
            staffName: staff.name,
            ticketTypeId: item.id,
            ticketTypeName: item.name,
            inventoryId: inv.id,
            seriesLabel: `${inv.seriesLabel} (#${inv.currentNumber}-#${inv.endNumber})`,
            quantity: qty,
            assignedDate: queueDate,
            upiMachineId: queueUpiMachine === '0' ? undefined : Number(queueUpiMachine)
        };

        setPendingAssignments(prev => [...prev, newAssignment]);

        // Reset Inputs (keep Staff/Date? user said "show to add next assignment", likely wanting rapid entry)
        // Let's clear Bundle, maybe keep Staff/Item? 
        // User flow: "next line : staff Name, Ticket item, Ticket bundle" -> implies restarting?
        // But usually removing friction is good. Let's clear Bundle only, easiest flow.
        setQueueInventoryId('');
        // setQueueItem(''); // Keep item? 
        // setQueueStaff(''); // Keep staff?
        // Let's clear everything to be safe based on "next line..." description implies a fresh row.
        // Actually, let's clear Bundle and Item, keep Staff? 
        // Let's clear Inventory ID only for now, assume they might adding multiple bundles for same staff/item.
        // If they want to change staff, they can.
    };

    const handleRemoveFromQueue = (tempId: number) => {
        setPendingAssignments(prev => prev.filter(p => p.tempId !== tempId));
    };

    const handleBulkAssignSubmit = async () => {
        if (pendingAssignments.length === 0) {
            setBulkAssignError('Queue is empty.');
            return;
        }
        setBulkAssignLoading(true);
        setBulkAssignError('');

        const assignmentsPayload = pendingAssignments.map(p => ({
            staffId: p.staffId,
            ticketTypeId: p.ticketTypeId,
            inventoryId: p.inventoryId,
            quantity: p.quantity,
            assignedDate: p.assignedDate, // Each row has its date (from header at add time)
            assignedUpiMachineId: p.upiMachineId
        }));

        const res = await import('@/app/ticketing-actions').then(m => m.bulkAssignTickets(assignmentsPayload));

        if (res.success) {
            setOpenBulkAssign(false);
            setPendingAssignments([]);
            setQueueInventoryId('');
            setQueueItem('');
            setQueueStaff('');
            router.refresh();
        } else {
            setBulkAssignError(res.error || 'Failed to assign');
        }
        setBulkAssignLoading(false);
    };



    // Bulk Settle State
    const [selectedAssignmentIds, setSelectedAssignmentIds] = useState<number[]>([]);
    const [selectedGroup, setSelectedGroup] = useState<GroupedAssignment | null>(null);
    const [openBulkSettle, setOpenBulkSettle] = useState(false);
    const [bulkReturns, setBulkReturns] = useState<Record<string, number>>({});
    const [bulkFirstReturns, setBulkFirstReturns] = useState<Record<string, string>>({});
    const [bulkCash, setBulkCash] = useState<number>(0);
    const [bulkUpi, setBulkUpi] = useState<number>(0);
    const [bulkError, setBulkError] = useState('');

    const toggleSelection = (id: number) => {
        // Legacy toggle single ID
        setSelectedAssignmentIds(prev =>
            prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
        );
    };

    const handleBulkSettleClick = () => {
        // Initialize returns for selected GROUPS
        const selectedAssigns = activeAssignments.filter(a => selectedAssignmentIds.includes(a.id));
        const groups = groupActiveAssignments(selectedAssigns);

        const initialReturns: Record<string, number> = {};
        groups.forEach(g => initialReturns[g.key] = 0);

        setBulkReturns(initialReturns);
        setBulkFirstReturns({});
        setBulkCash(0);
        setBulkUpi(0);
        setBulkError('');
        setOpenBulkSettle(true);
    };

    const handleBulkReturnChange = (key: string, val: number, max: number) => {
        const safeVal = Math.min(Math.max(0, val), max);
        setBulkReturns(prev => ({ ...prev, [key]: safeVal }));
        setBulkFirstReturns(prev => ({ ...prev, [key]: '' }));
    };

    const handleBulkFirstReturnChange = (key: string, val: string, group: GroupedAssignment) => {
        // Allow clearing input
        if (val === '') {
            setBulkFirstReturns(prev => ({ ...prev, [key]: '' }));
            setBulkReturns(prev => ({ ...prev, [key]: 0 }));
            return;
        }

        const startNum = Number(val);
        if (isNaN(startNum)) return;

        // Find the "last" batch in the group to apply logic
        // Let's find which batch this number belongs to.
        const targetBatch = group.assignments.find(a => startNum >= a.startNumber && startNum <= a.endNumber);

        if (targetBatch) {
            const sorted = [...group.assignments].sort((a, b) => a.id - b.id);
            const batchIndex = sorted.indexOf(targetBatch);

            let calculatedTotalReturns = 0;

            // Returns from target batch
            calculatedTotalReturns += (targetBatch.endNumber - startNum + 1);

            // Returns from all subsequent batches (higher start numbers)
            for (let i = batchIndex + 1; i < sorted.length; i++) {
                calculatedTotalReturns += sorted[i].assignedCount;
            }

            if (calculatedTotalReturns >= 0 && calculatedTotalReturns <= group.totalAssigned) {
                setBulkReturns(prev => ({ ...prev, [key]: calculatedTotalReturns }));
                setBulkFirstReturns(prev => ({ ...prev, [key]: val }));
            }
        } else {
            // Maybe entered number is out of range?
            setBulkFirstReturns(prev => ({ ...prev, [key]: val }));
        }
    };

    const calculateBulkTotalSold = () => {
        let total = 0;
        const selectedAssigns = activeAssignments.filter(a => selectedAssignmentIds.includes(a.id));
        const groups = groupActiveAssignments(selectedAssigns);

        groups.forEach(g => {
            const ret = bulkReturns[g.key] || 0;
            const sold = g.totalAssigned - ret;
            total += sold * g.ticketPrice;
        });

        return total;
    };

    const handleBulkSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setBulkError('');

        const totalSold = calculateBulkTotalSold();

        // 1. Resolve Settlements per Assignment
        const selectedAssigns = activeAssignments.filter(a => selectedAssignmentIds.includes(a.id));
        const groups = groupActiveAssignments(selectedAssigns);

        let allSettlements: any[] = [];

        groups.forEach(g => {
            let pendingReturns = bulkReturns[g.key] || 0;

            // Distribute returns to LAST batches first (highest start number)
            const sorted = [...g.assignments].sort((a, b) => b.id - a.id);

            sorted.forEach(asm => {
                const canReturn = asm.assignedCount;
                const actualReturn = Math.min(canReturn, pendingReturns);

                allSettlements.push({
                    assignmentId: asm.id,
                    returnCount: actualReturn,
                    assignedCount: asm.assignedCount,
                    price: asm.ticketType.price,
                    assignedDate: asm.assignedDate
                });

                pendingReturns -= actualReturn;
            });
        });

        // 2. Calculate Cash/UPI per assignment
        const payload = allSettlements.map(item => {
            const soldVal = (item.assignedCount - item.returnCount) * item.price;
            const ratio = totalSold > 0 ? soldVal / totalSold : 0;

            return {
                assignmentId: item.assignmentId,
                returnCount: item.returnCount,
                cashReceived: bulkCash * ratio,
                upiReceived: bulkUpi * ratio,
                returnDate: new Date(item.assignedDate).toISOString().split('T')[0]
            };
        });

        const res = await import('@/app/ticketing-actions').then(m => m.bulkSettleAssignments(payload));
        if (res.success) {
            setOpenBulkSettle(false);
            setSelectedAssignmentIds([]);
            router.refresh();
        } else {
            setBulkError(res.error || 'Failed to settle');
        }
        setLoading(false);
    };



    // Backdating & UPI Override State
    const [upiMachines, setUpiMachines] = useState<any[]>([]);

    // Load UPI Machines on mount
    // Load UPI Machines on mount
    useEffect(() => {
        getUPIMachines().then(res => {
            if (res.success && res.data) setUpiMachines(res.data);
        });
    }, []);

    // Auto-focus Assign Button
    const assignButtonRef = useRef<HTMLButtonElement>(null);
    useEffect(() => {
        if (assignButtonRef.current) {
            assignButtonRef.current.focus();
        }
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

    const handleEditSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        const formData = new FormData(e.currentTarget);
        const staffId = Number(formData.get('staffId'));
        const assignedDate = formData.get('assignedDate') as string;
        const assignedUpiMachineId = formData.get('assignedUpiMachineId') ? Number(formData.get('assignedUpiMachineId')) : undefined;

        if (selectedGroup) {
            let errorCount = 0;
            for (const id of selectedGroup.ids) {
                const res = await updateStaffAssignment({
                    assignmentId: id,
                    staffId,
                    assignedDate,
                    assignedUpiMachineId
                });
                if (!res.success) errorCount++;
            }
            if (errorCount > 0) setError(`Failed to update ${errorCount} assignments.`);
            else {
                setOpenEdit(false);
                setSelectedGroup(null);
                router.refresh();
            }
        } else if (selectedAssignment) {
            const res = await updateStaffAssignment({
                assignmentId: selectedAssignment.id,
                staffId,
                assignedDate,
                assignedUpiMachineId
            });

            if (res.success) {
                setOpenEdit(false);
                router.refresh();
            } else {
                setError(res.error || 'Failed to update assignment');
            }
        }
        setLoading(false);
    };

    const handleGroupUndo = async (group: GroupedAssignment) => {
        if (!confirm(`Are you sure you want to undo ALL allocations for this group (${group.totalAssigned} tickets)?`)) return;
        setLoading(true);

        let errorCount = 0;
        for (const id of group.ids) {
            const res = await undoStaffAssignment(id);
            if (!res.success) errorCount++;
        }

        if (errorCount > 0) {
            alert(`Failed to undo ${errorCount} assignments. They might be already settled.`);
        }
        router.refresh();
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

    const handleUndoSettlement = async (assignmentId: number) => {
        if (!confirm('Are you sure you want to Undo this settlement? This will reverse sales, financials, and restock returned tickets. Use caution.')) return;
        setLoading(true);
        const res = await undoSettlement(assignmentId);
        if (res.success) {
            router.refresh();
        } else {
            alert(res.error || 'Failed to undo settlement');
        }
        setLoading(false);
    };

    const activeAssignments = assignments.filter(a => a.status === 'Assigned');
    const returnedAssignments = assignments.filter(a => a.status === 'Returned');
    const settledAssignments = assignments.filter(a => a.status === 'Settled');

    const handleFinalizeSettlement = async (id: number) => {
        if (!confirm('Resolve this shortage/excess and mark as finalized?')) return;
        setLoading(true);
        const res = await finalizeStaffSettlement(id);
        if (res.success) router.refresh();
        else alert(res.error);
        setLoading(false);
    };

    const getStaffBalances = () => {
        const balances: Record<string, { name: string, short: number, excess: number }> = {};
        // Only include Returned (Pending Settle) and Settled?
        // User said "keep a record of Short/Excess". Assuming all non-active.
        [...returnedAssignments, ...settledAssignments].forEach(a => {
            const diff = a.difference || 0;
            if (diff === 0) return;
            if (!balances[a.staffId]) balances[a.staffId] = { name: a.staff.name, short: 0, excess: 0 };

            if (diff < 0) balances[a.staffId].short += Math.abs(diff);
            else balances[a.staffId].excess += diff;
        });
        return Object.values(balances);
    };

    const [openBalanceReport, setOpenBalanceReport] = useState(false);

    // Group Active Assignments
    const groupActiveAssignments = (list: Assignment[]): GroupedAssignment[] => {
        const groups: Record<string, GroupedAssignment> = {};

        list.forEach(a => {
            const dateStr = new Date(a.assignedDate).toISOString().split('T')[0];
            const key = `${a.staff.id}-${a.ticketType.id}-${dateStr}`;

            if (!groups[key]) {
                groups[key] = {
                    key,
                    staffId: a.staff.id,
                    staffName: a.staff.name,
                    ticketTypeId: a.ticketType.id,
                    ticketTypeName: a.ticketType.name,
                    ticketCategory: a.ticketType.category,
                    ticketPrice: a.ticketType.price,
                    assignedDate: dateStr,
                    totalAssigned: 0,
                    ids: [],
                    seriesLabels: [],
                    assignments: []
                };
            }
            groups[key].totalAssigned += a.assignedCount;
            groups[key].ids.push(a.id);
            groups[key].seriesLabels.push(`${a.seriesLabel} (${a.startNumber}-${a.endNumber})`);
            groups[key].assignments.push(a);
        });

        return Object.values(groups).sort((a, b) => b.ids[0] - a.ids[0]);
    };

    const activeGroups = groupActiveAssignments(activeAssignments);

    const toggleGroupSelection = (group: GroupedAssignment) => {
        const allSelected = group.ids.every(id => selectedAssignmentIds.includes(id));
        if (allSelected) {
            setSelectedAssignmentIds(prev => prev.filter(id => !group.ids.includes(id)));
        } else {
            setSelectedAssignmentIds(prev => {
                const newIds = [...prev];
                group.ids.forEach(id => {
                    if (!newIds.includes(id)) newIds.push(id);
                });
                return newIds;
            });
        }
    };

    // Filter compatible stock for assignment

    // Filter compatible stock for assignment
    const currentTicketType = items.find(i => i.id.toString() === selectedItem);
    const compatibleStock = currentTicketType
        ? inventory.filter(inv => {
            if (inv.status !== 'Available') return false;

            // Allow any Entrance category stock for Entrance tickets (ignore price/exact match)
            if (currentTicketType.category === 'Entrance' && inv.category === 'Entrance') {
                return true;
            }

            // Default strict matching for others (e.g. Amusement must match price/variant)
            return inv.category === currentTicketType.category && inv.price === currentTicketType.price;
        })
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

    const editTarget = selectedAssignment || selectedGroup?.assignments[0];

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
                <div className="flex gap-2">
                    <Button variant="outline" onClick={() => {
                        setPendingAssignments([]);
                        setQueueInventoryId('');
                        setQueueItem('');
                        setQueueStaff('');
                        setOpenBulkAssign(true);
                    }}>
                        Bulk Assign
                    </Button>
                    <Button ref={assignButtonRef} onClick={() => setOpenAssign(true)}>Assign New Bundle</Button>
                </div>
            </div>

            <Tabs defaultValue="active-allocations">


                <TabsList>
                    <TabsTrigger value="active-allocations">Active Assignments ({activeAssignments.length})</TabsTrigger>
                    <TabsTrigger value="counter">Counter Allocation</TabsTrigger>
                    <TabsTrigger value="returned-history">Returned History ({returnedAssignments.length})</TabsTrigger>
                    <TabsTrigger value="all-history">Settlement History</TabsTrigger>
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

                <TabsContent value="active-allocations">
                    <div className="flex justify-between items-center mb-2">
                        <div className="flex items-center gap-2">
                            {selectedAssignmentIds.length > 0 && (
                                <Button size="sm" onClick={handleBulkSettleClick} className="bg-green-600 hover:bg-green-700 text-white gap-2">
                                    <CheckCircle className="h-4 w-4" /> Return Selected ({selectedAssignmentIds.length})
                                </Button>
                            )}
                        </div>
                        <div className="flex gap-2">
                            <Button variant="outline" size="sm" onClick={() => setOpenBalanceReport(true)}>
                                <FileText className="h-4 w-4 mr-2" /> Staff Balances
                            </Button>
                            <Button variant="outline" size="sm" onClick={handleExportAllocations} className="gap-2">
                                <Download className="h-4 w-4" /> Download CSV
                            </Button>
                        </div>
                    </div>
                    <div className="border rounded-md bg-white">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="w-[50px]">
                                        {/* Select All */}
                                    </TableHead>
                                    <TableHead>Staff Name</TableHead>
                                    <TableHead>Ticket Item</TableHead>
                                    <TableHead>Series / Range</TableHead>
                                    <TableHead>Total Qty</TableHead>
                                    <TableHead>Date</TableHead>
                                    <TableHead className="text-right">Action</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {activeGroups.map(group => {
                                    const isSelected = group.ids.every(id => selectedAssignmentIds.includes(id));
                                    const partSelected = group.ids.some(id => selectedAssignmentIds.includes(id));

                                    return (
                                        <TableRow key={group.key}>
                                            <TableCell>
                                                <Checkbox
                                                    checked={isSelected}
                                                    onCheckedChange={() => toggleGroupSelection(group)}
                                                    className={partSelected && !isSelected ? "opacity-50" : ""}
                                                />
                                            </TableCell>
                                            <TableCell className="font-medium">{group.staffName}</TableCell>
                                            <TableCell>
                                                {group.ticketTypeName}
                                                <span className="text-xs text-gray-500 ml-1">({group.ticketCategory})</span>
                                            </TableCell>
                                            <TableCell className="font-mono text-xs max-w-[200px] break-words">
                                                {group.seriesLabels.join(', ')}
                                            </TableCell>
                                            <TableCell className="font-bold">{group.totalAssigned}</TableCell>
                                            <TableCell className="text-sm text-gray-500">
                                                {new Date(group.assignedDate).toLocaleDateString('en-GB')}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    className="mr-2"
                                                    title="Add Additional Bundle"
                                                    onClick={() => {
                                                        setSelectedStaff(group.staffId.toString());
                                                        setSelectedItem(group.ticketTypeId.toString());
                                                        setQuantity(0);
                                                        setSelectedStock('');
                                                        setOpenAssign(true);
                                                    }}
                                                >
                                                    <Plus className="h-4 w-4" />
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    className="mr-2"
                                                    title="Edit Assignment Group"
                                                    onClick={() => {
                                                        setSelectedGroup(group);
                                                        // Pre-fill form
                                                        setSelectedStaff(group.staffId.toString());
                                                        // We set assignedDate from the group
                                                        // Warning: The Edit Dialog needs to handle Date pre-fill if it relies on selectedAssignment
                                                        // We fake a selectedAssignment or just ensure form uses defaultValue?
                                                        // Looking at Edit Dialog implementation (not shown fully but likely uses defaults)
                                                        setOpenEdit(true);
                                                    }}
                                                >
                                                    <Pencil className="h-4 w-4" />
                                                </Button>
                                                <Button
                                                    variant="destructive"
                                                    size="icon"
                                                    className="mr-2 h-9 w-9"
                                                    title="Undo All Assignments in Group"
                                                    onClick={() => handleGroupUndo(group)}
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    onClick={() => {
                                                        // Select ONLY this group
                                                        setSelectedAssignmentIds(group.ids);
                                                        // Needs timeout or effect to open dialog after state update? 
                                                        // No, handleBulkSettleClick needs state to be set.
                                                        // We can't set state and read it in same handler.
                                                        // We can call a modified handler logic.

                                                        // Hack: Set state then open. Or handleBulkSettleClickWithIds
                                                        // Let's manually invoke logic here
                                                        const initialReturns: Record<string, number> = {};
                                                        initialReturns[group.key] = 0;
                                                        setBulkReturns(initialReturns);
                                                        setBulkFirstReturns({});
                                                        setBulkCash(0);
                                                        setBulkUpi(0);
                                                        setBulkError('');
                                                        setSelectedAssignmentIds(group.ids);
                                                        setOpenBulkSettle(true);
                                                    }}
                                                >
                                                    Settle / Return
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    );
                                })}
                                {activeGroups.length === 0 && (
                                    <TableRow>
                                        <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                                            No active staff assignments.
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </TabsContent>

                <TabsContent value="all-history">
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
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {settledAssignments.map(assign => (
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
                                        <TableCell className="text-right">
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-8 w-8 text-orange-600 hover:text-orange-700 hover:bg-orange-50"
                                                title="Undo Settlement"
                                                onClick={() => handleUndoSettlement(assign.id)}
                                            >
                                                <RotateCcw className="h-4 w-4" />
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                </TabsContent>

                <TabsContent value="returned-history">
                    <div className="border rounded-md bg-white">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Staff Name</TableHead>
                                    <TableHead>Item</TableHead>
                                    <TableHead>Return Date</TableHead>
                                    <TableHead>Sold / Total</TableHead>
                                    <TableHead>Short / Excess</TableHead>
                                    <TableHead className="text-right">Action</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {returnedAssignments.map(assign => {
                                    const diff = assign.difference || 0;
                                    return (
                                        <TableRow key={assign.id}>
                                            <TableCell className="font-medium">{assign.staff.name}</TableCell>
                                            <TableCell>{assign.ticketType.name}</TableCell>
                                            <TableCell className="text-sm text-gray-500">
                                                {assign.returnDate ? new Date(assign.returnDate).toLocaleDateString('en-GB') : '-'}
                                            </TableCell>
                                            <TableCell>{assign.soldCount} / {assign.assignedCount}</TableCell>
                                            <TableCell>
                                                {diff === 0 ? (
                                                    <span className="text-gray-400">-</span>
                                                ) : diff < 0 ? (
                                                    <span className="text-red-600 font-bold">Short: ₹{Math.abs(diff)}</span>
                                                ) : (
                                                    <span className="text-green-600 font-bold">Excess: ₹{diff}</span>
                                                )}
                                            </TableCell>
                                            <TableCell className="text-right flex justify-end gap-2">
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-8 w-8 text-orange-600 hover:text-orange-700 hover:bg-orange-50"
                                                    title="Undo Return"
                                                    onClick={() => handleUndoSettlement(assign.id)}
                                                >
                                                    <RotateCcw className="h-4 w-4" />
                                                </Button>
                                                <Button size="sm" onClick={() => handleFinalizeSettlement(assign.id)}>
                                                    <CheckCircle className="h-4 w-4 mr-1" /> Settle
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    );
                                })}
                                {returnedAssignments.length === 0 && <TableRow><TableCell colSpan={6} className="text-center p-4">No pending returns.</TableCell></TableRow>}
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
                                    {staffList.filter(s => ['Booking', 'Amusement'].includes(s.department)).sort((a, b) => a.name.localeCompare(b.name)).map(s => (
                                        <SelectItem key={s.id} value={s.id.toString()}>{s.name}</SelectItem>
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
                                        <SelectItem value="0" className="text-gray-500">
                                            Default ({currentTicketType?.upiMachine?.name || 'None'})
                                        </SelectItem>
                                        <SelectItem value="-1" className="text-red-500">Nil (No Machine)</SelectItem>
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

            {/* STAFF BALANCE DIALOG */}
            <Dialog open={openBalanceReport} onOpenChange={setOpenBalanceReport}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Staff Account Balances</DialogTitle>
                    </DialogHeader>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Staff Name</TableHead>
                                <TableHead className="text-red-600">Total Shortage</TableHead>
                                <TableHead className="text-green-600">Total Excess</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {getStaffBalances().map((b, i) => (
                                <TableRow key={i}>
                                    <TableCell className="font-bold">{b.name}</TableCell>
                                    <TableCell className="text-red-600 font-mono">₹{b.short}</TableCell>
                                    <TableCell className="text-green-600 font-mono">₹{b.excess}</TableCell>
                                </TableRow>
                            ))}
                            {getStaffBalances().length === 0 && (
                                <TableRow><TableCell colSpan={3} className="text-center text-gray-500">No discrepancies found.</TableCell></TableRow>
                            )}
                        </TableBody>
                    </Table>
                </DialogContent>
            </Dialog>

            {/* EDIT DIALOG */}
            <Dialog open={openEdit} onOpenChange={setOpenEdit}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Edit Assignment {selectedGroup ? '(Group)' : ''}</DialogTitle>
                    </DialogHeader>
                    {editTarget && (
                        <form onSubmit={handleEditSubmit} className="space-y-4">
                            {error && (
                                <div className="bg-red-50 text-red-500 p-3 rounded-md text-sm flex items-center gap-2">
                                    <AlertCircle className="h-4 w-4" /> {error}
                                </div>
                            )}

                            <div className="space-y-2">
                                <Label>Staff Member</Label>
                                <Select name="staffId" defaultValue={editTarget.staff.id.toString()}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select Staff" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {staffList.filter(s => ['Booking', 'Amusement'].includes(s.department)).sort((a, b) => a.name.localeCompare(b.name)).map(s => (
                                            <SelectItem key={s.id} value={s.id.toString()}>{s.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <Label>Assignment Date</Label>
                                <div className="relative">
                                    <Calendar className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
                                    <Input
                                        name="assignedDate"
                                        type="date"
                                        className="pl-9"
                                        defaultValue={new Date(editTarget.assignedDate).toISOString().split('T')[0]}
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label>KPI / UPI Machine</Label>
                                <Select name="assignedUpiMachineId" defaultValue={editTarget.assignedUpiMachineId?.toString() || "0"}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Default (Auto)" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="0" className="text-gray-500">
                                            Default ({editTarget.ticketType.upiMachine?.name || 'None'})
                                        </SelectItem>
                                        <SelectItem value="-1" className="text-red-500">Nil (No Machine)</SelectItem>
                                        {upiMachines.map(m => (
                                            <SelectItem key={m.id} value={m.id.toString()}>
                                                {m.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <DialogFooter>
                                <Button type="button" variant="outline" onClick={() => setOpenEdit(false)}>Cancel</Button>
                                <Button type="submit" disabled={loading}>Save Changes</Button>
                            </DialogFooter>
                        </form>
                    )}
                </DialogContent>
            </Dialog>

            {/* BULK SETTLE DIALOG */}
            <Dialog open={openBulkSettle} onOpenChange={setOpenBulkSettle}>
                <DialogContent className="max-w-[95vw] md:max-w-7xl">
                    <DialogHeader>
                        <DialogTitle>Bulk Staff Settlement</DialogTitle>
                    </DialogHeader>

                    {bulkError && <div className="p-3 bg-red-50 text-red-600 rounded">{bulkError}</div>}

                    <div className="max-h-[70vh] overflow-y-auto">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Staff / Item</TableHead>
                                    <TableHead>Assigned</TableHead>
                                    <TableHead>Range</TableHead>
                                    <TableHead className="w-[120px]">First Return No.</TableHead>
                                    <TableHead className="w-[100px]">Returns</TableHead>
                                    <TableHead className="text-right">Sold Value</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {(() => {
                                    // Groups for settlement
                                    const selectedAssigns = assignments.filter(a => selectedAssignmentIds.includes(a.id));
                                    const groups = groupActiveAssignments(selectedAssigns);

                                    return groups.map(group => {
                                        const ret = bulkReturns[group.key] || 0;
                                        const sold = group.totalAssigned - ret;
                                        const val = sold * group.ticketPrice;

                                        return (
                                            <TableRow key={group.key}>
                                                <TableCell>
                                                    <div className="font-bold">{group.staffName}</div>
                                                    <div className="text-xs text-gray-500">{group.ticketTypeName}</div>
                                                </TableCell>
                                                <TableCell>{group.totalAssigned}</TableCell>
                                                <TableCell className="text-xs break-words max-w-[150px]">
                                                    {group.seriesLabels.join(', ')}
                                                </TableCell>
                                                <TableCell>
                                                    <Input
                                                        type="number"
                                                        placeholder="Last Tix #"
                                                        className="h-8 text-xs border-blue-300"
                                                        value={bulkFirstReturns[group.key] || ''}
                                                        onChange={(e) => handleBulkFirstReturnChange(group.key, e.target.value, group)}
                                                        autoFocus
                                                    />
                                                </TableCell>
                                                <TableCell>
                                                    <div className="h-8 flex items-center justify-center font-bold bg-gray-50 rounded border border-gray-200 text-gray-700">
                                                        {ret}
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-right font-mono">
                                                    ₹{val.toLocaleString()}
                                                </TableCell>
                                            </TableRow>
                                        );
                                    });
                                })()}
                            </TableBody>
                        </Table>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-slate-50 p-4 rounded-lg items-end">
                        <div>
                            <Label>Total Sold Value</Label>
                            <div className="text-2xl font-bold text-blue-600">₹{calculateBulkTotalSold().toLocaleString()}</div>
                        </div>
                        <div>
                            <Label>Total Cash Received</Label>
                            <Input
                                type="number"
                                value={bulkCash}
                                onChange={(e) => setBulkCash(Number(e.target.value))}
                                className="font-bold"
                            />
                        </div>
                        <div>
                            <Label>Total UPI Received</Label>
                            <Input
                                type="number"
                                value={bulkUpi}
                                onChange={(e) => setBulkUpi(Number(e.target.value))}
                                className="font-bold"
                            />
                        </div>
                        <div>
                            <Label>Short / Excess</Label>
                            <div className={`text-xl font-bold ${((bulkCash + bulkUpi) - calculateBulkTotalSold()) < 0 ? 'text-red-500' : ((bulkCash + bulkUpi) - calculateBulkTotalSold()) > 0 ? 'text-green-600' : 'text-gray-500'}`}>
                                {((bulkCash + bulkUpi) - calculateBulkTotalSold()) < 0 ? 'Short: ' : ((bulkCash + bulkUpi) - calculateBulkTotalSold()) > 0 ? 'Excess: ' : ''}
                                ₹{Math.abs((bulkCash + bulkUpi) - calculateBulkTotalSold()).toLocaleString()}
                            </div>
                        </div>
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setOpenBulkSettle(false)}>Cancel</Button>
                        <Button onClick={handleBulkSubmit} disabled={loading}>Confirm Bulk Settlement</Button>
                    </DialogFooter>
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

                            {/* Ticket Number Helper */}
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label className="text-blue-600">First Returned Ticket No.</Label>
                                    <Input
                                        id="firstReturnedInput"
                                        type="number"
                                        placeholder={`${selectedAssignment.endNumber}`}
                                        onChange={handleFirstReturnChange}
                                        className="border-blue-200"
                                    />
                                    <p className="text-[10px] text-gray-400">Auto-calculate count</p>
                                </div>

                                <div className="space-y-2">
                                    <div className="flex justify-between items-center">
                                        <Label>Returned Count</Label>
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="sm"
                                            className="h-5 px-2 text-[10px] text-green-600 hover:text-green-700 hover:bg-green-50"
                                            onClick={() => {
                                                setReturnCount(0);
                                                // Clear the helper input if possible or just rely on state
                                                const helperInput = document.getElementById('firstReturnedInput') as HTMLInputElement;
                                                if (helperInput) helperInput.value = '';
                                            }}
                                        >
                                            All Sold (0 Return)
                                        </Button>
                                    </div>
                                    <Input
                                        name="returnedCount"
                                        type="number"
                                        min="0"
                                        max={selectedAssignment.assignedCount}
                                        value={returnCount}
                                        onChange={(e) => setReturnCount(Number(e.target.value))}
                                        required
                                        className="font-bold border-green-200"
                                    />
                                </div>
                            </div>

                            {/* Live Summary */}
                            <div className="bg-slate-100 p-3 rounded border border-slate-200 grid grid-cols-2 gap-4 text-center">
                                <div>
                                    <div className="text-xs text-gray-500 uppercase font-semibold">Sold Count</div>
                                    <div className="text-xl font-bold text-green-600">
                                        {selectedAssignment.assignedCount - returnCount}
                                    </div>
                                </div>
                                <div>
                                    <div className="text-xs text-gray-500 uppercase font-semibold">Total Amount</div>
                                    <div className="text-xl font-bold text-blue-600 flex items-center justify-center gap-1">
                                        <IndianRupee className="h-4 w-4" />
                                        {(selectedAssignment.assignedCount - returnCount) * selectedAssignment.ticketType.price}
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label>Settlement Date</Label>
                                <div className="relative">
                                    <Calendar className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
                                    <Input
                                        name="returnDate"
                                        type="date"
                                        className="pl-9 bg-gray-100 text-gray-500 cursor-not-allowed"
                                        defaultValue={new Date(selectedAssignment.assignedDate).toISOString().split('T')[0]}
                                        readOnly
                                    />
                                </div>
                                <p className="text-xs text-gray-500">Same as Assignment Date (Fixed).</p>
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

            {/* BULK ASSIGN QUEUE DIALOG */}
            <Dialog open={openBulkAssign} onOpenChange={setOpenBulkAssign}>
                <DialogContent className="w-11/12 sm:max-w-7xl max-h-[85vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Bulk Assign Bundles</DialogTitle>
                    </DialogHeader>

                    {bulkAssignError && <div className="p-3 bg-red-50 text-red-600 rounded">{bulkAssignError}</div>}

                    <div className="space-y-6">
                        {/* Header: Date Selection */}
                        <div className="flex items-center gap-4 bg-gray-50 p-3 rounded-md border text-sm">
                            <Label className="font-semibold w-32">Assignment Date:</Label>
                            <Input
                                type="date"
                                value={queueDate}
                                max={todayStr}
                                onChange={(e) => setQueueDate(e.target.value)}
                                className="w-[180px] bg-white h-9"
                            />
                            <p className="text-gray-500 text-xs ml-2">Selected date applies to items added to queue.</p>

                            <div className="w-px h-8 bg-gray-300 mx-2"></div>

                            <Label className="font-semibold w-32">UPI Machine:</Label>
                            <Select value={queueUpiMachine} onValueChange={setQueueUpiMachine}>
                                <SelectTrigger className="w-[180px] bg-white h-9">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="0">Default (Auto)</SelectItem>
                                    <SelectItem value="-1" className="text-red-500">Nil (No Machine)</SelectItem>
                                    {upiMachines.map(m => <SelectItem key={m.id} value={m.id.toString()}>{m.name}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Input Row */}
                        <div className="grid grid-cols-12 gap-2 items-end bg-blue-50 p-4 rounded-md border border-blue-200">
                            <div className="col-span-3 space-y-1">
                                <Label className="text-xs font-semibold text-blue-800">Staff Member</Label>
                                <Select value={queueStaff} onValueChange={setQueueStaff}>
                                    <SelectTrigger className="bg-white h-9 text-sm">
                                        <SelectValue placeholder="Select Staff" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {staffList.filter(s => ['Booking', 'Amusement'].includes(s.department)).sort((a, b) => a.name.localeCompare(b.name)).map(s => (
                                            <SelectItem key={s.id} value={s.id.toString()}>{s.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="col-span-3 space-y-1">
                                <Label className="text-xs font-semibold text-blue-800">Ticket Item</Label>
                                <Select value={queueItem} onValueChange={(val) => {
                                    setQueueItem(val);
                                    setQueueInventoryId('');
                                }}>
                                    <SelectTrigger className="bg-white h-9 text-sm">
                                        <SelectValue placeholder="Select Item" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {[...items].sort((a, b) => a.name.localeCompare(b.name)).map(i => (
                                            <SelectItem key={i.id} value={i.id.toString()}>{i.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="col-span-4 space-y-1">
                                <Label className="text-xs font-semibold text-blue-800">Ticket Bundle</Label>
                                <Select value={queueInventoryId} onValueChange={(val) => setQueueInventoryId(val === "none" ? "" : val)}>
                                    <SelectTrigger className="bg-white h-9 text-sm">
                                        <SelectValue placeholder={queueItem ? "Select Bundle" : "Select Item first"} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="none">-- Select --</SelectItem>
                                        {queueCompatibleStock.map(inv => {
                                            const range = inv.endNumber - inv.currentNumber + 1;
                                            return (
                                                <SelectItem key={inv.id} value={inv.id.toString()}>
                                                    {inv.seriesLabel} (#{inv.currentNumber}-#{inv.endNumber}) • Qty: {range}
                                                </SelectItem>
                                            );
                                        })}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="col-span-2">
                                <Button
                                    className="w-full bg-blue-600 hover:bg-blue-700 h-9"
                                    onClick={handleAddToQueue}
                                    disabled={!queueStaff || !queueItem || !queueInventoryId || queueInventoryId === 'none'}
                                >
                                    <Plus className="w-4 h-4 mr-1" /> Add
                                </Button>
                            </div>
                        </div>

                        {/* Queue List */}
                        <div className="border rounded-md min-h-[200px] overflow-hidden">
                            <Table>
                                <TableHeader className="bg-gray-100">
                                    <TableRow>
                                        <TableHead>Staff Name</TableHead>
                                        <TableHead>Ticket Item</TableHead>
                                        <TableHead>Bundle</TableHead>
                                        <TableHead>Quantity</TableHead>
                                        <TableHead>Assigned Date</TableHead>
                                        <TableHead className="text-right">Remove</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {pendingAssignments.map((p) => (
                                        <TableRow key={p.tempId}>
                                            <TableCell className="font-medium">{p.staffName}</TableCell>
                                            <TableCell>{p.ticketTypeName}</TableCell>
                                            <TableCell className="font-mono text-xs">{p.seriesLabel}</TableCell>
                                            <TableCell className="font-bold">{p.quantity}</TableCell>
                                            <TableCell className="text-xs text-gray-500">{p.assignedDate}</TableCell>
                                            <TableCell className="text-right">
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50"
                                                    onClick={() => handleRemoveFromQueue(p.tempId)}
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                    {pendingAssignments.length === 0 && (
                                        <TableRow>
                                            <TableCell colSpan={6} className="text-center py-12 text-gray-400">
                                                Queue is empty. Add assignments using the row above.
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    </div>

                    <DialogFooter className="mt-4">
                        <Button variant="outline" onClick={() => setOpenBulkAssign(false)}>Cancel</Button>
                        <Button onClick={handleBulkAssignSubmit} disabled={bulkAssignLoading || pendingAssignments.length === 0} className="w-40">
                            {bulkAssignLoading ? 'Processing...' : `Confirm All (${pendingAssignments.length})`}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
