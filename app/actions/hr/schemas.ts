import { z } from 'zod';

export const employeeSchema = z.object({
    eventId: z.coerce.number(),
    name: z.string().min(2, "Name must be at least 2 characters"),
    age: z.coerce.number().min(18).max(100),
    dob: z.string(),
    address: z.string().min(5),
    contactNo: z.string().min(10),
    secContact: z.string().optional(),
    adharNumber: z.string().min(12),
    department: z.string().min(1),
    salaryAmount: z.coerce.number().min(0).default(0),
    salaryFrequency: z.enum(['Monthly', 'Daily']).default('Monthly'),
    status: z.enum(['Active', 'Inactive']).default('Active'),
    joiningDate: z.string().optional().nullable(),
    endDate: z.string().optional().nullable(),
    userId: z.coerce.number().optional().nullable(),
});

export const attendanceSchema = z.object({
    staffId: z.coerce.number(),
    date: z.string(), // ISO Date
    status: z.enum(['Present', 'Absent', 'HalfDay', 'Leave']),
    checkIn: z.string().optional(), // ISO Time/Date
    checkOut: z.string().optional(),
    remarks: z.string().optional()
});

export const payrollSchema = z.object({
    staffId: z.coerce.number(),
    month: z.coerce.number().min(1).max(12),
    year: z.coerce.number(),
    baseSalary: z.coerce.number(),
    presentDays: z.coerce.number(),
    deductions: z.coerce.number().default(0),
    incentives: z.coerce.number().default(0),
    advance: z.coerce.number().default(0),
    netSalary: z.coerce.number(),
    status: z.enum(['Pending', 'Paid']).default('Pending'),
    paymentMethod: z.enum(['Cash', 'UPI']).optional(),
    transactionId: z.string().optional(), // For UPI
});
