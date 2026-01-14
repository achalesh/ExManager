'use server';

import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { getSession } from '@/lib/auth';

// --- Schema Definitions ---

const assignStockSchema = z.object({
    staffId: z.coerce.number().min(1, 'Select a staff member'),
    ticketInventoryId: z.coerce.number().min(1, 'Select a ticket bundle'),
    ticketTypeId: z.coerce.number().min(1, 'Ticket Type is required'),
    quantity: z.coerce.number().min(1, 'Quantity is required'),
    assignedDate: z.string().optional(),
});

const reconcileSchema = z.object({
    assignmentId: z.coerce.number(),
    returnedCount: z.coerce.number().min(0, 'Cannot be negative'),
    cashReceived: z.coerce.number().min(0, 'Cannot be negative'),
    upiReceived: z.coerce.number().min(0, 'Cannot be negative').optional().default(0),
    remarks: z.string().optional(),
});

// --- Server Actions ---

// 1. Assign Stock to Staff
export async function assignStockToStaff(formData: FormData) {
    const session = await getSession();
    if (!session || !['Admin', 'Manager', 'Office', 'Operations'].includes(session.roleName)) {
        return { success: false, error: 'Unauthorized' };
    }

    try {
        const rawData = {
            staffId: formData.get('staffId'),
            ticketInventoryId: formData.get('ticketInventoryId'),
            ticketTypeId: formData.get('ticketTypeId'),
            quantity: formData.get('quantity'),
            assignedDate: formData.get('assignedDate'),
        };

        const parsed = assignStockSchema.parse(rawData);
        const { staffId, ticketInventoryId, ticketTypeId, quantity, assignedDate } = parsed;

        await prisma.$transaction(async (tx) => {
            // 1. Fetch Inventory to check availability
            const inventory = await tx.ticketInventory.findUnique({
                where: { id: ticketInventoryId },
            });

            if (!inventory) throw new Error('Inventory not found');

            const available = inventory.endNumber - inventory.currentNumber + 1;
            if (quantity > available) {
                throw new Error(`Insufficient stock. Available: ${available}, Requested: ${quantity}`);
            }

            // 2. Determine Range
            const startNumber = inventory.currentNumber;
            const endNumber = startNumber + quantity - 1;

            // 3. Create Assignment
            await tx.staffTicketAssignment.create({
                data: {
                    staffId,
                    ticketInventoryId,
                    ticketTypeId,
                    seriesLabel: inventory.seriesLabel,
                    startNumber,
                    endNumber,
                    assignedCount: quantity,
                    status: 'Assigned',
                    assignedDate: assignedDate ? new Date(assignedDate) : new Date(),
                }
            });

            // 4. Deduct from Inventory
            const updatedInv = await tx.ticketInventory.update({
                where: { id: ticketInventoryId },
                data: { currentNumber: endNumber + 1 }
            });

            if (updatedInv.currentNumber > updatedInv.endNumber) {
                await tx.ticketInventory.update({
                    where: { id: ticketInventoryId },
                    data: { status: 'Exhausted' }
                });
            }
        });

        revalidatePath('/dashboard/ticketing');
        revalidatePath('/dashboard/staff');
        return { success: true };
    } catch (error: any) {
        console.error('Assign Stock Error:', error);
        return { success: false, error: error.message || 'Failed to assign stock' };
    }
}

// 2. Get Active Assignments (for Reconciliation)
export async function getActiveAssignments() {
    const session = await getSession();
    if (!session) return [];

    return await prisma.staffTicketAssignment.findMany({
        where: {
            status: 'Assigned',
            // Filter by active event if needed contextually, assuming staffId filter in UI
        },
        include: {
            staff: true,
            ticketType: true,
        },
        orderBy: { assignedDate: 'desc' }
    });
}

// 3. Reconcile Assignment (Return Stock & Cash)
export async function reconcileAssignment(formData: FormData) {
    const session = await getSession();
    if (!session || !['Admin', 'Manager', 'Office'].includes(session.roleName)) {
        return { success: false, error: 'Unauthorized' };
    }

    try {
        const rawData = {
            assignmentId: formData.get('assignmentId'),
            returnedCount: formData.get('returnedCount'),
            cashReceived: formData.get('cashReceived'),
            upiReceived: formData.get('upiReceived'),
            remarks: formData.get('remarks'),
        };

        const parsed = reconcileSchema.parse(rawData);
        const { assignmentId, returnedCount, cashReceived, upiReceived, remarks } = parsed;

        await prisma.$transaction(async (tx) => {
            const assignment = await tx.staffTicketAssignment.findUnique({
                where: { id: assignmentId },
                include: {
                    ticketType: true,
                    ticketInventory: true // Need inventory for eventId
                }
            });

            if (!assignment) throw new Error('Assignment not found');
            if (assignment.status !== 'Assigned') throw new Error('Assignment already reconciled');

            const soldCount = assignment.assignedCount - returnedCount;
            if (soldCount < 0) throw new Error('Returned count cannot exceed assigned count');

            const totalAmount = soldCount * assignment.ticketType.price;
            const difference = (cashReceived + upiReceived) - totalAmount;

            // Update Assignment
            await tx.staffTicketAssignment.update({
                where: { id: assignmentId },
                data: {
                    status: 'Returned',
                    returnDate: assignment.assignedDate || new Date(),
                    returnedCount,
                    soldCount,
                    totalAmount,
                    cashReceived,
                    upiReceived,
                    difference,
                }
            });

            const eventId = assignment.ticketInventory.eventId;

            // 1. Handle Returns -> Create New Inventory
            if (returnedCount > 0) {
                const returnStart = assignment.endNumber - returnedCount + 1;
                const returnEnd = assignment.endNumber;

                const newLabel = assignment.seriesLabel.trim().endsWith('(Ret)')
                    ? assignment.seriesLabel
                    : `${assignment.seriesLabel} (Ret)`;

                await tx.ticketInventory.create({
                    data: {
                        eventId: eventId,
                        seriesLabel: newLabel,
                        startNumber: returnStart,
                        endNumber: returnEnd,
                        currentNumber: returnStart,
                        status: 'Available',
                        price: assignment.ticketInventory.price,
                        category: assignment.ticketInventory.category
                    }
                });
            }

            // 2. Handle Sales -> Create TicketSale Record
            if (soldCount > 0) {
                const sale = await tx.ticketSale.create({
                    data: {
                        eventId: eventId,
                        totalAmount: totalAmount,
                        // @ts-ignore
                        source: 'Staff',
                    }
                });

                const saleItems = [];
                const soldStart = assignment.startNumber;
                const soldEnd = assignment.endNumber - returnedCount;

                for (let i = soldStart; i <= soldEnd; i++) {
                    saleItems.push({
                        saleId: sale.id,
                        ticketTypeId: assignment.ticketTypeId,
                        ticketNumber: i,
                        price: assignment.ticketType.price
                    });
                }

                await tx.ticketSaleItem.createMany({
                    data: saleItems
                });
            }
        });

        revalidatePath('/dashboard/ticketing');
        // Revalidate inventory page too since we might have added stock
        revalidatePath('/dashboard/settings/inventory');
        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

// 4. Get Staff Accounts (Settlement View)
export async function getStaffAccounts() {
    const session = await getSession();
    if (!session) return [];

    // Use queryRaw to bypass stale Prisma Client if generation failed (missing upiReceived)
    try {
        const rows = await prisma.$queryRaw<any[]>`
            SELECT 
                sta.id, 
                sta."returnDate", 
                sta."soldCount", 
                sta."startNumber", 
                sta."endNumber",
                sta."totalAmount", 
                sta."cashReceived", 
                sta."upiReceived", 
                sta."difference", 
                s.name as "staffName", 
                s."contactNo" as "staffContact",
                tt.name as "ticketTypeName"
            FROM "StaffTicketAssignment" sta
            JOIN "Staff" s ON sta."staffId" = s.id
            JOIN "TicketType" tt ON sta."ticketTypeId" = tt.id
            WHERE sta.status = 'Returned' AND (sta."isSettled" = false)
            ORDER BY sta."returnDate" DESC
        `;

        // Debug logging
        // console.log("Raw Rows:", rows);

        return rows.map((row: any) => ({
            id: row.id,
            returnDate: row.returnDate,
            soldCount: row.soldCount,
            startNumber: row.startNumber,
            endNumber: row.endNumber,
            totalAmount: row.totalAmount,
            cashReceived: row.cashReceived,
            upiReceived: Number(row.upiReceived || 0), // Explicit cast to Number
            difference: row.difference,
            staff: {
                name: row.staffName,
                contactNo: row.staffContact
            },
            ticketType: {
                name: row.ticketTypeName
            }
        }));
    } catch (e) {
        console.error("Error fetching accounts", e);
        return [];
    }
}


// 5. Settle Account
export async function settleAccount(id: number) {
    const session = await getSession();
    if (!session || !['Admin', 'Manager', 'Office'].includes(session.roleName)) {
        return { success: false, error: 'Unauthorized' };
    }

    try {
        await prisma.staffTicketAssignment.update({
            where: { id },
            data: {
                isSettled: true,
                settlementDate: new Date(),
            }
        });
        revalidatePath('/dashboard/ticketing');
        revalidatePath('/dashboard/ticketing/settlements');
        return { success: true };
    } catch (error) {
        return { success: false, error: 'Failed to settle account' };
    }
}

// 6. Delete Assignment (Validation: Only if latest)
export async function deleteAssignment(id: number) {
    const session = await getSession();
    if (!session || !['Admin', 'Manager'].includes(session.roleName)) {
        return { success: false, error: 'Unauthorized' };
    }

    try {
        await prisma.$transaction(async (tx) => {
            const assignment = await tx.staffTicketAssignment.findUnique({
                where: { id },
                include: { ticketInventory: true }
            });

            if (!assignment) throw new Error('Assignment not found');
            if (assignment.status !== 'Assigned') throw new Error('Cannot delete reconciled assignment');

            // Logic to check if this is the LAST assignment for this inventory
            // Inventory.currentNumber should equal Assignment.endNumber + 1
            const inventory = assignment.ticketInventory;
            if (inventory.currentNumber !== assignment.endNumber + 1) {
                throw new Error('Cannot delete assignment: Subsequent assignments exist. Please return stock instead.');
            }

            // Restore Inventory
            await tx.ticketInventory.update({
                where: { id: inventory.id },
                data: { currentNumber: assignment.startNumber }
            });

            // Delete Record
            await tx.staffTicketAssignment.delete({ where: { id } });
        });

        revalidatePath('/dashboard/ticketing');
        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

// 7. Undo Reconciliation
export async function undoReconciliation(assignmentId: number) {
    const session = await getSession();
    if (!session || !['Admin', 'Manager'].includes(session.roleName)) {
        return { success: false, error: 'Unauthorized' };
    }

    try {
        await prisma.$transaction(async (tx) => {
            const assignment = await tx.staffTicketAssignment.findUnique({
                where: { id: assignmentId },
                include: {
                    ticketType: true,
                    ticketInventory: true
                }
            });

            if (!assignment) throw new Error('Assignment not found');
            if (assignment.status !== 'Returned') throw new Error('Assignment is not reconciled');
            if (assignment.isSettled) throw new Error('Cannot undo settled assignment');

            // 1. Revert Returned Stock (if any)
            if (assignment.returnedCount && assignment.returnedCount > 0) {
                const returnStart = assignment.endNumber - assignment.returnedCount + 1;

                // Find the specific returned inventory created
                // Note: The returned inventory has the same Event ID and Series Label + " (Ret)"
                const retInventory = await tx.ticketInventory.findFirst({
                    where: {
                        eventId: assignment.ticketInventory.eventId,
                        seriesLabel: `${assignment.seriesLabel} (Ret)`,
                        startNumber: returnStart,
                    }
                });

                if (retInventory) {
                    // Check if it's been used
                    if (retInventory.currentNumber !== retInventory.startNumber) {
                        throw new Error('Cannot undo: Returned tickets have already been re-assigned.');
                    }
                    // Delete it
                    await tx.ticketInventory.delete({ where: { id: retInventory.id } });
                }
            }

            // 2. Revert Sales (if any)
            if (assignment.soldCount && assignment.soldCount > 0) {
                const soldStart = assignment.startNumber;
                const soldEnd = assignment.endNumber - (assignment.returnedCount || 0);

                // Delete Sale Items
                await tx.ticketSaleItem.deleteMany({
                    where: {
                        ticketTypeId: assignment.ticketTypeId,
                        ticketNumber: {
                            gte: soldStart,
                            lte: soldEnd
                        }
                    }
                });

                // Note: We leave the TicketSale parent record. It might be empty now, but it's harmless. 
                // Cleaning it up would require more complex queries to see if it has other items.
            }

            // 3. Reset Assignment Status
            await tx.staffTicketAssignment.update({
                where: { id: assignmentId },
                data: {
                    status: 'Assigned',
                    returnDate: null,
                    returnedCount: 0,
                    soldCount: 0,
                    totalAmount: 0,
                    cashReceived: 0,
                    upiReceived: 0,
                    difference: 0,
                }
            });
        });

        revalidatePath('/dashboard/ticketing');
        revalidatePath('/dashboard/ticketing/staff');
        revalidatePath('/dashboard/ticketing/settlements');
        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

// 8. Bulk Settle Accounts
export async function bulkSettleAccounts(ids: number[]) {
    const session = await getSession();
    if (!session || !['Admin', 'Manager', 'Office'].includes(session.roleName)) {
        return { success: false, error: 'Unauthorized' };
    }

    try {
        await prisma.staffTicketAssignment.updateMany({
            where: {
                id: { in: ids },
                status: 'Returned',
                isSettled: false
            },
            data: {
                isSettled: true,
                settlementDate: new Date(),
            }
        });
        revalidatePath('/dashboard/ticketing');
        revalidatePath('/dashboard/ticketing/settlements');
        return { success: true };
    } catch (error) {
        return { success: false, error: 'Failed to bulk settle accounts' };
    }
}
