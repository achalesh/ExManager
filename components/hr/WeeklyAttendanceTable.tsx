'use client';

import { useState } from 'react';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow
} from '@/components/ui/table';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue
} from '@/components/ui/select';
import { markAttendance } from '@/app/actions/hr/attendance';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Wand2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { markAllUnmarkedPresent } from '@/app/actions/hr/attendance';

interface WeeklyAttendanceTableProps {
    staffList: any[];
    startDate: Date;
    weekDates: Date[];
    eventId: number;
}

export function WeeklyAttendanceTable({ staffList, startDate, weekDates, eventId }: WeeklyAttendanceTableProps) {
    // Local state to track updates if needed, though we will rely on server revalidation primarily
    const [updating, setUpdating] = useState<string | null>(null);

    const handleStatusChange = async (staffId: number, date: Date, status: string) => {
        const key = `${staffId}-${date.toISOString()}`;
        setUpdating(key);

        const validStatus = status as "Present" | "Absent";

        if (status === 'Not Marked') {
            setUpdating(null);
            return;
        }

        const formData = {
            staffId,
            date: date.toISOString(),
            status: validStatus,
            remarks: ''
        };

        const result = await markAttendance(formData);

        if (!result.success) {
            toast.error(result.error || 'Failed to update attendance');
            // Optimistic update rollback not implemented for simplicity, assumed server refresh
        } else {
            // Optional: toast.success('Updated'); - too spammy for grid
        }

        setUpdating(null);
        setUpdating(null);
    };

    const handleAutoFill = async (date: Date) => {
        if (!confirm(`Mark all unmarked staff as Present for ${date.toDateString()}?`)) return;

        const key = `autofill-${date.toISOString()}`;
        setUpdating(key);

        try {
            const result = await markAllUnmarkedPresent(eventId, date.toISOString());
            if (result.success) {
                toast.success(`Marked ${result.count} staff as Present`);
            } else {
                toast.error(result.error);
            }
        } catch (e) {
            toast.error('Failed to auto-mark');
        } finally {
            setUpdating(null);
        }
    };

    const getAttendanceStatus = (staff: any, date: Date) => {
        const record = staff.attendance.find((a: any) =>
            new Date(a.date).toDateString() === date.toDateString()
        );
        return record?.status || 'Not Marked';
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'Present': return 'bg-green-100 text-green-700 border-green-200';
            case 'Absent': return 'bg-red-100 text-red-700 border-red-200';
            case 'HalfDay': return 'bg-yellow-100 text-yellow-700 border-yellow-200';
            case 'Leave': return 'bg-blue-100 text-blue-700 border-blue-200';
            default: return 'text-gray-500';
        }
    };

    return (
        <div className="rounded-md border bg-white shadow-sm overflow-hidden">
            <Table>
                <TableHeader className="bg-gray-50">
                    <TableRow>
                        <TableHead className="w-[200px] sticky left-0 bg-gray-50 z-10">Employee</TableHead>
                        {weekDates.map(date => (
                            <TableHead key={date.toISOString()} className="text-center min-w-[120px]">
                                <div className="flex flex-col items-center">
                                    <span className="text-xs text-gray-500 font-normal">
                                        {date.toLocaleDateString('en-US', { weekday: 'short' })}
                                    </span>
                                    <span className="font-medium text-gray-900">
                                        {date.getDate()}
                                    </span>
                                </div>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-6 w-6 mt-1 hover:bg-indigo-50 hover:text-indigo-600"
                                    title="Auto-fill Unmarked as Present"
                                    onClick={() => handleAutoFill(date)}
                                    disabled={!!updating}
                                >
                                    <Wand2 className="h-3 w-3" />
                                </Button>
                            </TableHead>
                        ))}
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {staffList.map((staff) => (
                        <TableRow key={staff.id} className="hover:bg-gray-50/50">
                            <TableCell className="sticky left-0 bg-white z-10 font-medium border-r">
                                <div className="flex items-center gap-3">
                                    <Avatar className="h-8 w-8 border border-gray-200">
                                        {staff.photoUrl && (
                                            <AvatarImage src={staff.photoUrl} alt={staff.name} className="object-cover" />
                                        )}
                                        <AvatarFallback className="bg-indigo-50 text-indigo-600 text-xs font-semibold">
                                            {staff.name.charAt(0).toUpperCase()}
                                        </AvatarFallback>
                                    </Avatar>
                                    <div className="flex flex-col">
                                        <span className="text-sm font-medium text-gray-900">{staff.name}</span>
                                        <span className="text-[10px] text-gray-500">{staff.department}</span>
                                    </div>
                                </div>
                            </TableCell>
                            {weekDates.map(date => {
                                const status = getAttendanceStatus(staff, date);
                                const isUpdating = updating === `${staff.id}-${date.toISOString()}`;

                                return (
                                    <TableCell key={date.toISOString()} className="p-2 text-center">
                                        <div className="relative">
                                            {isUpdating && (
                                                <div className="absolute inset-0 flex items-center justify-center bg-white/50 z-20">
                                                    <Loader2 className="h-4 w-4 animate-spin text-indigo-500" />
                                                </div>
                                            )}
                                            <Select
                                                defaultValue={status}
                                                onValueChange={(val) => handleStatusChange(staff.id, date, val)}
                                            >
                                                <SelectTrigger
                                                    className={cn(
                                                        "h-8 text-xs w-full text-center justify-center font-medium border-0 focus:ring-1 focus:ring-offset-0 focus:ring-indigo-500 shadow-none bg-transparent hover:bg-gray-100 transition-colors",
                                                        getStatusColor(status)
                                                    )}
                                                >
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="Not Marked" className="text-gray-500">Not Marked</SelectItem>
                                                    <SelectItem value="Present" className="text-green-700 font-medium">Present</SelectItem>
                                                    <SelectItem value="Absent" className="text-red-700 font-medium">Absent</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </TableCell>
                                );
                            })}
                        </TableRow>
                    ))}
                    {staffList.length === 0 && (
                        <TableRow>
                            <TableCell colSpan={8} className="h-24 text-center text-gray-500">
                                No employees found.
                            </TableCell>
                        </TableRow>
                    )}
                </TableBody>
            </Table>
        </div>
    );
}
