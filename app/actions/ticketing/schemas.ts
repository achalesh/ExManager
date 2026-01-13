import { z } from 'zod';

// --- Schema Definitions ---

export const ticketSaleSchema = z.object({
    eventId: z.coerce.number(),
    items: z.array(z.object({
        ticketTypeId: z.coerce.number(),
        quantity: z.coerce.number().min(1),
    })),
});

export const ticketTypeSchema = z.object({
    eventId: z.coerce.number(),
    category: z.enum(['Entrance', 'Amusement', 'Office']),
    name: z.string().min(2),
    price: z.coerce.number().min(0),
    // Deprecated single owner fields, keeping for backward compatibility in Zod but logic will change
    amusementOwnerId: z.coerce.number().optional().nullable(),
    ownerSharePercentage: z.coerce.number().optional(),

    // New Multi-Owner Support
    ownerShares: z.array(z.object({
        amusementOwnerId: z.coerce.number(),
        sharePercentage: z.coerce.number()
    })).optional(),

    // UPI Machine Assignment
    upiMachineId: z.coerce.number().optional().nullable(),
    ticketsPerBooklet: z.coerce.number().optional().default(100),
});

export const ticketBatchSchema = z.object({
    ticketTypeId: z.coerce.number(),
    mode: z.enum(['manual', 'inventory']).default('manual'),
    startNumber: z.coerce.number().optional(),
    endNumber: z.coerce.number().optional(),
    inventoryId: z.coerce.number().optional(),
    quantity: z.coerce.number().optional(),
});

export const assignStockSchema = z.object({
    ticketTypeId: z.coerce.number(),
    inventoryId: z.coerce.number(),
    quantity: z.coerce.number().min(1)
});

export const staffAssignmentSchema = z.object({
    staffId: z.coerce.number(),
    ticketTypeId: z.coerce.number(),
    inventoryId: z.coerce.number(),
    quantity: z.coerce.number().min(1),
    assignedDate: z.string().optional(), // ISO String
    assignedUpiMachineId: z.coerce.number().optional()
});

export const settlementSchema = z.object({
    assignmentId: z.coerce.number(),
    returnedCount: z.coerce.number().min(0),
    cashReceived: z.coerce.number().min(0),
    upiReceived: z.coerce.number().min(0).optional().default(0),
    returnDate: z.string().optional() // ISO String
});

export const updateAssignmentSchema = z.object({
    assignmentId: z.coerce.number(),
    staffId: z.coerce.number(),
    assignedDate: z.string().optional(),
    assignedUpiMachineId: z.coerce.number().optional()
});
