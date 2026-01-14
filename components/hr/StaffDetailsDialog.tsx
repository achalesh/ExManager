'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, CreditCard } from 'lucide-react';
import { updatePayrollStatus } from '@/app/hr-actions';
import { toast } from 'sonner';

interface StaffDetailsDialogProps {
    staff: any;
    history: any[];
    children: React.ReactNode;
}

export function StaffDetailsDialog({ staff, history, children }: StaffDetailsDialogProps) {
    const [open, setOpen] = useState(false);
    const [updatingId, setUpdatingId] = useState<number | null>(null);

    const [loadingPayAll, setLoadingPayAll] = useState(false);
    const router = useRouter();
    // Need to import useRouter from next/navigation

    // Calculate Stats
    const totalEarned = history
        .filter(p => p.status === 'Paid')
        .reduce((sum, p) => sum + p.netSalary, 0);

    const totalPending = history
        .filter(p => p.status === 'Pending')
        .reduce((sum, p) => sum + p.netSalary, 0);

    const handlePay = async (payrollId: number) => {
        setUpdatingId(payrollId);
        try {
            const result = await updatePayrollStatus(payrollId, 'Paid', 'Cash');
            if (result.success) {
                toast.success('Marked as Paid');
                router.refresh();
            } else {
                toast.error('Failed: ' + result.error);
            }
        } catch (e) {
            toast.error('Error updating status');
        }
        setUpdatingId(null);
    };

    const handlePayAll = async () => {
        if (!confirm('Are you sure you want to mark ALL pending items as Paid (Cash)?')) return;

        setLoadingPayAll(true);
        try {
            const pendingIds = history.filter(p => p.status === 'Pending').map(p => p.id);
            // We need a bulk update action. updatePayrollStatus takes one ID. 
            // We can loop or create a new action. Looping is easier for now given small numbers.
            // Or better: Promise.all
            await Promise.all(pendingIds.map(id => updatePayrollStatus(id, 'Paid', 'Cash')));

            toast.success('All pending items marked as Paid');
            router.refresh();
        } catch (e) {
            toast.error('Error updating status');
        }
        setLoadingPayAll(false);
    }

    const formatCurrency = (val: number) => `₹ ${val.toLocaleString('en-IN')}`;

    const getWeekDateRange = (year: number, month: number, week: number) => {
        const lastDayOfMonth = new Date(year, month, 0).getDate();

        let startDate = 1;
        let endDate = lastDayOfMonth;

        if (week && week > 0) {
            startDate = (week - 1) * 7 + 1;
            endDate = Math.min(week * 7, lastDayOfMonth);
        }

        // Format: "1st - 7th" or "22nd - 28th"
        const getOrdinal = (n: number) => {
            const s = ["th", "st", "nd", "rd"];
            const v = n % 100;
            return n + (s[(v - 20) % 10] || s[v] || s[0]);
        };

        return `${getOrdinal(startDate)} - ${getOrdinal(endDate)}`;
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <div className="cursor-pointer hover:underline decoration-blue-500 underline-offset-2">
                    {children}
                </div>
            </DialogTrigger>
            <DialogContent className="sm:max-w-5xl w-full max-h-[85vh] flex flex-col">
                <DialogHeader className="flex-shrink-0">
                    <DialogTitle>Employee Details</DialogTitle>
                </DialogHeader>

                <div className="flex gap-6 mb-6 flex-shrink-0">
                    <Avatar className="h-20 w-20 border-2 border-white shadow-md">
                        {staff.photoUrl ? (
                            <AvatarImage src={`/uploads/${staff.photoUrl}`} alt={staff.name} className="object-cover" />
                        ) : null}
                        <AvatarFallback className="text-xl bg-blue-100 text-blue-700">
                            {staff.name.substring(0, 2).toUpperCase()}
                        </AvatarFallback>
                    </Avatar>

                    <div className="space-y-1">
                        <h2 className="text-2xl font-bold text-gray-900">{staff.name}</h2>
                        <div className="flex gap-2">
                            <Badge variant="secondary">{staff.department}</Badge>
                            <Badge variant="outline">{staff.salaryFrequency}</Badge>
                        </div>
                        <div className="text-sm text-gray-500 pt-1">
                            Base Salary: {formatCurrency(staff.salaryAmount)} / {staff.salaryFrequency === 'Daily' ? 'Day' : 'Month'}
                        </div>
                    </div>

                    <div className="ml-auto flex gap-4 text-right">
                        <div>
                            <div className="text-sm font-medium text-gray-500">Total Paid</div>
                            <div className="text-xl font-bold text-green-600">{formatCurrency(totalEarned)}</div>
                        </div>
                        <div>
                            <div className="text-sm font-medium text-gray-500">Pending</div>
                            <div className="text-xl font-bold text-red-600">{formatCurrency(totalPending)}</div>
                        </div>
                    </div>
                    {totalPending > 0 && (
                        <div className="flex-shrink-0 flex items-center">
                            <Button onClick={handlePayAll} disabled={loadingPayAll} size="sm" className="bg-green-600 hover:bg-green-700">
                                {loadingPayAll ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <CreditCard className="w-4 h-4 mr-2" />}
                                Pay All
                            </Button>
                        </div>
                    )}
                </div>

                <div className="flex-grow min-h-0">
                    <h3 className="font-semibold mb-2">Payment History</h3>
                    <ScrollArea className="h-[400px] border rounded-md">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-gray-50 text-gray-500 font-medium sticky top-0">
                                <tr>
                                    <th className="px-4 py-2">Period</th>
                                    <th className="px-4 py-2">Present</th>
                                    <th className="px-4 py-2">Calculated</th>
                                    <th className="px-4 py-2">Net Salary</th>
                                    <th className="px-4 py-2">Status</th>
                                    <th className="px-4 py-2 text-right">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y">
                                {history.length === 0 ? (
                                    <tr>
                                        <td colSpan={6} className="px-4 py-8 text-center text-gray-400">No payment history found</td>
                                    </tr>
                                ) : (
                                    history.map((record) => (
                                        <tr key={record.id} className="hover:bg-gray-50">
                                            <td className="px-4 py-3 font-medium">
                                                <div className="flex flex-col">
                                                    <span>{new Date(record.year, record.month - 1).toLocaleString('default', { month: 'short' })} {record.year}</span>
                                                    <span className="text-[11px] text-gray-500 font-normal">
                                                        {getWeekDateRange(record.year, record.month, record.weekNumber)}
                                                    </span>
                                                    {record.weekNumber > 0 && <span className="text-[10px] text-blue-600 font-medium">Week {record.weekNumber}</span>}
                                                </div>
                                            </td>
                                            <td className="px-4 py-3">{record.presentDays} / {record.totalDays}</td>
                                            <td className="px-4 py-3">{formatCurrency(record.calculated)}</td>
                                            <td className="px-4 py-3 font-bold">{formatCurrency(record.netSalary)}</td>
                                            <td className="px-4 py-3">
                                                <Badge variant={record.status === 'Paid' ? 'default' : 'secondary'}
                                                    className={record.status === 'Paid' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}>
                                                    {record.status}
                                                </Badge>
                                                {record.paymentDate && (
                                                    <div className="text-[10px] text-gray-500 mt-0.5">
                                                        {new Date(record.paymentDate).toLocaleDateString()}
                                                    </div>
                                                )}
                                            </td>
                                            <td className="px-4 py-3 text-right">
                                                {record.status === 'Pending' ? (
                                                    <Button
                                                        size="sm"
                                                        variant="default" // Primary color for action
                                                        className="h-7"
                                                        onClick={() => handlePay(record.id)}
                                                        disabled={updatingId === record.id}
                                                    >
                                                        {updatingId === record.id ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Pay'}
                                                    </Button>
                                                ) : (
                                                    <span className="text-green-600 text-xs font-semibold flex items-center justify-end gap-1">
                                                        <CreditCard className="w-3 h-3" /> Paid
                                                    </span>
                                                )}
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </ScrollArea>
                </div>
            </DialogContent>
        </Dialog>
    );
}
