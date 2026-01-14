'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { getSession } from '@/lib/auth';
import { attendanceSchema } from './schemas';
import { z } from 'zod';

export async function markAttendance(data: z.infer<typeof attendanceSchema>) {
    const session = await getSession();
    if (!session || !['Admin', 'Manager', 'Accountant'].includes(session.roleName)) {
        return { success: false, error: 'Unauthorized' };
    }

    try {
        const parsed = attendanceSchema.parse(data);
        const attendanceDate = new Date(parsed.date);

        // Ensure date is UTC midnight or handled consistently
        // We typically store dates as given, assuming client sends YYYY-MM-DD or ISO

        // Find if exists
        const existing = await prisma.staffAttendance.findUnique({
            where: {
                staffId_date: {
                    staffId: parsed.staffId,
                    date: attendanceDate
                }
            }
        });

        // Get Event ID from staff if not passed (though schema doesn't require eventId in input, we need it for DB)
        // Oops, DB requires eventId. We should fetch it from staff.
        const staff = await prisma.staff.findUnique({ where: { id: parsed.staffId } });
        if (!staff) return { success: false, error: 'Staff not found' };

        if (existing) {
            await prisma.staffAttendance.update({
                where: { id: existing.id },
                data: {
                    status: parsed.status,
                    checkIn: parsed.checkIn ? new Date(parsed.checkIn) : existing.checkIn,
                    checkOut: parsed.checkOut ? new Date(parsed.checkOut) : existing.checkOut,
                    remarks: parsed.remarks
                }
            });
        } else {
            await prisma.staffAttendance.create({
                data: {
                    staffId: parsed.staffId,
                    eventId: staff.eventId,
                    date: attendanceDate,
                    status: parsed.status,
                    checkIn: parsed.checkIn ? new Date(parsed.checkIn) : null,
                    checkOut: parsed.checkOut ? new Date(parsed.checkOut) : null,
                    remarks: parsed.remarks
                }
            });
        }

        revalidatePath('/dashboard/hr/attendance');
        return { success: true };
    } catch (error: any) {
        console.error('Mark attendance error:', error);
        return { success: false, error: error.message || 'Failed to mark attendance' };
    }
}

export async function getDailyAttendance(eventId: number, dateStr: string) {
    const session = await getSession();
    if (!session) return [];

    const date = new Date(dateStr);

    // We need to fetch ALL staff, and join with attendance for that day
    const staffList = await prisma.staff.findMany({
        where: { eventId, status: 'Active' },
        orderBy: { name: 'asc' },
        include: {
            attendance: {
                where: { date: date },
                take: 1
            }
        }
    });

    return staffList.map(s => ({
        ...s,
        attendance: s.attendance[0] || null
    }));
}

export async function getWeeklyAttendance(eventId: number, startDateStr: string, endDateStr: string) {
    const session = await getSession();
    if (!session) return [];

    const startDate = new Date(startDateStr);
    const endDate = new Date(endDateStr);

    // Set times to cover full days in UTC/Local correctly
    // Ideally, pass YYYY-MM-DD and just comp strings, or set start to 00:00 and end to 23:59
    startDate.setHours(0, 0, 0, 0);
    endDate.setHours(23, 59, 59, 999);

    const staffList = await prisma.staff.findMany({
        where: { eventId, status: 'Active' },
        orderBy: { name: 'asc' },
        include: {
            attendance: {
                where: {
                    date: {
                        gte: startDate,
                        lte: endDate
                    }
                }
            }
        }
    });


    return staffList;
}

export async function markAllUnmarkedPresent(eventId: number, dateStr: string) {
    const session = await getSession();
    if (!session || !['Admin', 'Manager', 'Accountant'].includes(session.roleName)) {
        return { success: false, error: 'Unauthorized' };
    }

    const date = new Date(dateStr);

    // Find all staff
    const staffList = await prisma.staff.findMany({
        where: { eventId, status: 'Active' },
        include: {
            attendance: {
                where: { date: date }
            }
        }
    });

    // Filter those who have NO attendance record
    const unmarkedStaff = staffList.filter(s => s.attendance.length === 0);

    if (unmarkedStaff.length === 0) {
        return { success: true, count: 0 };
    }

    // Create records
    const records = unmarkedStaff.map(s => ({
        staffId: s.id,
        eventId: eventId,
        date: date,
        status: 'Present',
        remarks: 'Auto-marked (End of Day)'
    }));

    await prisma.staffAttendance.createMany({
        data: records
    });

    revalidatePath('/dashboard/hr/attendance');
    return { success: true, count: records.length };
}
