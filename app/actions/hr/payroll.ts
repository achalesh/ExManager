'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { getSession } from '@/lib/auth';
import { payrollSchema } from './schemas';

export async function generatePayroll(eventId: number, month: number, year: number) {
    const session = await getSession();
    if (!session || !['Admin', 'Manager', 'Accountant'].includes(session.roleName)) {
        return { success: false, error: 'Unauthorized' };
    }

    try {
        const staffList = await prisma.staff.findMany({
            where: { eventId, status: 'Active' }
        });

        const startDate = new Date(year, month - 1, 1);
        const endDate = new Date(year, month, 0); // Last day of month
        const totalDaysInMonth = endDate.getDate();

        let generatedCount = 0;

        for (const staff of staffList) {
            // Count present days
            const attendance = await prisma.staffAttendance.findMany({
                where: {
                    staffId: staff.id,
                    date: {
                        gte: startDate,
                        lte: endDate
                    },
                    status: 'Present' // Or HalfDay logic?
                }
            });

            // Calculate present days (handling half days if we implemented them properly, currently assuming status check)
            // Let's check status string: 'Present', 'HalfDay'
            // We need to fetch all statuses and sum
            const allAttendance = await prisma.staffAttendance.findMany({
                where: {
                    staffId: staff.id,
                    date: {
                        gte: startDate,
                        lte: endDate
                    }
                }
            });

            let presentDays = 0;
            for (const att of allAttendance) {
                if (att.status === 'Present') presentDays += 1;
                else if (att.status === 'HalfDay') presentDays += 0.5;
            }

            // Calculation
            let calculatedSalary = 0;
            if (staff.salaryFrequency === 'Monthly') {
                calculatedSalary = (staff.salaryAmount / 30) * presentDays; // Standard 30 day basis often used, or totalDaysInMonth
                // Let's use 30 for simplicity or totalDaysInMonth?
                // Usually Daily Rate = Monthly / 30.
                calculatedSalary = (staff.salaryAmount / 30) * presentDays;
            } else {
                // Daily wage
                calculatedSalary = staff.salaryAmount * presentDays;
            }

            const netSalary = Math.round(calculatedSalary); // Rounding

            // Create or Update Payroll
            const existing = await prisma.staffPayroll.findUnique({
                where: {
                    staffId_month_year: {
                        staffId: staff.id,
                        month,
                        year
                    }
                }
            });

            if (!existing || existing.status === 'Pending') {
                // Only overwrite if pending. If paid, don't auto-regenerate without explicit force (safe default)
                await prisma.staffPayroll.upsert({
                    where: {
                        staffId_month_year: {
                            staffId: staff.id,
                            month,
                            year
                        }
                    },
                    update: {
                        baseSalary: staff.salaryAmount,
                        presentDays,
                        totalDays: totalDaysInMonth,
                        calculated: calculatedSalary,
                        netSalary: netSalary, // Deductions/Incentives persist from UI edits? 
                        // If we regenerate, we might lose manual edits if we just overwrite. 
                        // Ideally we should keep deductions/incentives if existing.
                        ...(existing ? {} : { deductions: 0, incentives: 0, advance: 0 })
                    },
                    create: {
                        staffId: staff.id,
                        eventId: staff.eventId,
                        month,
                        year,
                        baseSalary: staff.salaryAmount,
                        presentDays,
                        totalDays: totalDaysInMonth,
                        calculated: calculatedSalary,
                        deductions: 0,
                        incentives: 0,
                        advance: 0,
                        netSalary: netSalary,
                        status: 'Pending'
                    }
                });
                generatedCount++;
            }
        }

        revalidatePath('/dashboard/hr/payroll');
        return { success: true, count: generatedCount };

    } catch (error: any) {
        console.error('Payroll generation error:', error);
        return { success: false, error: error.message };
    }
}

export async function generateWeeklyPayroll(eventId: number, weekStartStr: string, weekEndStr: string) {
    const session = await getSession();
    if (!session || !['Admin', 'Manager', 'Accountant'].includes(session.roleName)) {
        return { success: false, error: 'Unauthorized' };
    }

    try {
        const weekStart = new Date(weekStartStr);
        const weekEnd = new Date(weekEndStr);
        // Ensure full day coverage
        weekStart.setHours(0, 0, 0, 0);
        weekEnd.setHours(23, 59, 59, 999);

        // Calculate which month/year this 'week' mostly belongs to for the record
        // Or just use the weekEnd's month/year
        const recordMonth = weekEnd.getMonth() + 1;
        const recordYear = weekEnd.getFullYear();

        // Use ISO week number if possible or just an incrementing index?
        // Let's use a simple heuristic: weekNumber = 0 is monthly. 1,2,3,4,5 are for weekly.
        // We need to know WHICH week of the month this is to update the correct record.
        // Simplified: Use the day of month of the Start Date to determine week number (1st-7th = 1, etc)
        const dayOfMonth = weekStart.getDate();
        const weekNumber = Math.ceil(dayOfMonth / 7);

        const staffList = await prisma.staff.findMany({
            where: { eventId, status: 'Active', department: 'Booking' }
        });

        let generatedCount = 0;

        for (const staff of staffList) {
            // Determine effective start/end for this staff
            let effectiveStart = weekStart;
            if (staff.joiningDate && staff.joiningDate > weekStart) {
                effectiveStart = staff.joiningDate;
                // If they joined after the week ended, skip
                if (effectiveStart > weekEnd) continue;
            }

            let effectiveEnd = weekEnd;
            if (staff.endDate && staff.endDate < weekEnd) {
                effectiveEnd = staff.endDate;
                // If they left before the week started, skip
                if (effectiveEnd < weekStart) continue;
            }

            // If the effective range is invalid (e.g. joined after left?), skip
            if (effectiveStart > effectiveEnd) continue;

            // Fetch attendance ONLY within effective range
            const attendance = await prisma.staffAttendance.findMany({
                where: {
                    staffId: staff.id,
                    date: {
                        gte: effectiveStart,
                        lte: effectiveEnd
                    }
                }
            });

            let presentDays = 0;
            for (const att of attendance) {
                if (att.status === 'Present') presentDays += 1;
                else if (att.status === 'HalfDay') presentDays += 0.5;
            }

            // Calculation
            let calculatedSalary = 0;
            if (staff.salaryFrequency === 'Daily') {
                calculatedSalary = staff.salaryAmount * presentDays;
            } else {
                // Monthly Salary Logic for Weekly Generation
                // If full week present? 
                // Formula: (Monthly / 30) * presentDays
                calculatedSalary = (staff.salaryAmount / 30) * presentDays;
            }

            const netSalary = Math.round(calculatedSalary);

            const existing = await prisma.staffPayroll.findUnique({
                where: {
                    staffId_month_year_weekNumber: {
                        staffId: staff.id,
                        month: recordMonth,
                        year: recordYear,
                        weekNumber: weekNumber
                    }
                }
            });

            if (!existing || existing.status === 'Pending') {
                await prisma.staffPayroll.upsert({
                    where: {
                        staffId_month_year_weekNumber: {
                            staffId: staff.id,
                            month: recordMonth,
                            year: recordYear,
                            weekNumber: weekNumber
                        }
                    },
                    update: {
                        baseSalary: staff.salaryAmount,
                        presentDays,
                        totalDays: 7, // This is technically "Week Duration", maybe calculate actual duration if partial week?
                        // For simplicity, keep it standardized as the period duration or partial? 
                        // Let's keep 7 as "max possible for a full week" or just leave it.
                        // Actually if we want to show capacity:
                        // totalDays: Math.ceil((effectiveEnd.getTime() - effectiveStart.getTime()) / (1000 * 60 * 60 * 24)) + 1,
                        calculated: calculatedSalary,
                        netSalary: netSalary,
                        ...(existing ? {} : { deductions: 0, incentives: 0, advance: 0 })
                    },
                    create: {
                        staffId: staff.id,
                        eventId: staff.eventId,
                        month: recordMonth,
                        year: recordYear,
                        weekNumber,
                        baseSalary: staff.salaryAmount,
                        presentDays,
                        totalDays: 7,
                        calculated: calculatedSalary,
                        netSalary: netSalary,
                        status: 'Pending'
                    }
                });
                generatedCount++;
            }
        }

        revalidatePath('/dashboard/hr/payroll');
        return { success: true, count: generatedCount };

    } catch (error: any) {
        console.error('Weekly Payroll generation error:', error);
        return { success: false, error: error.message };
    }
}


export async function getPayrollList(eventId: number, month: number, year: number) {
    const session = await getSession();
    if (!session) return [];

    return await prisma.staffPayroll.findMany({
        where: { eventId, month, year },
        include: { staff: true },
        orderBy: [
            { staff: { name: 'asc' } },
            { weekNumber: 'asc' }
        ]
    });
}

export async function updatePayrollStatus(id: number, status: string, method?: string, txId?: string) {
    const session = await getSession();
    if (!session || !['Admin', 'Manager', 'Accountant'].includes(session.roleName)) {
        return { success: false, error: 'Unauthorized' };
    }

    try {
        await prisma.staffPayroll.update({
            where: { id },
            data: {
                status,
                paymentDate: status === 'Paid' ? new Date() : null,
                paymentMethod: method,
                transactionId: txId
            }
        });
        revalidatePath('/dashboard/hr/payroll');
        return { success: true };
    } catch (error) {
        return { success: false, error: 'Update failed' };
    }
}

export async function getStaffPayrollHistory(staffId: number) {
    const session = await getSession();
    if (!session) return [];

    return await prisma.staffPayroll.findMany({
        where: { staffId },
        orderBy: [
            { year: 'desc' },
            { month: 'desc' },
            { weekNumber: 'desc' }
        ]
    });
}
