'use server';

import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { getSession } from '@/lib/auth';

// --- Schema Definitions ---

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

// --- Staff Allocation ---

export async function assignTicketsToStaff(data: z.infer<typeof staffAssignmentSchema>) {
    const session = await getSession();
    if (!session || !['Admin', 'Manager'].includes(session.roleName)) {
        return { success: false, error: 'Unauthorized' };
    }

    try {
        const parsed = staffAssignmentSchema.parse(data);

        return await prisma.$transaction(async (tx) => {
            const inventory = await tx.ticketInventory.findUnique({ where: { id: parsed.inventoryId } });
            if (!inventory || inventory.status !== 'Available') throw new Error('Stock unavailable');

            const available = inventory.endNumber - inventory.currentNumber + 1;
            if (parsed.quantity > available) throw new Error(`Insufficient stock. Available: ${available}`);

            const startNumber = inventory.currentNumber;
            const endNumber = startNumber + parsed.quantity - 1;

            const ticketType = await tx.ticketType.findUnique({ where: { id: parsed.ticketTypeId } });
            if (!ticketType) throw new Error('Ticket Type not found');

            // Determine UPI Machine
            // Priority: Manual Override -> Ticket Type Default -> Null
            let finalMachineId: number | null | undefined = parsed.assignedUpiMachineId;

            if (finalMachineId === -1) {
                // Explicit "Nil" selected
                finalMachineId = null;
            } else if (!finalMachineId) {
                // No override (0 or undefined), use default
                finalMachineId = ticketType.upiMachineId || null;
            }

            // Determine Date
            const assignedDate = parsed.assignedDate ? new Date(parsed.assignedDate) : new Date();

            // @ts-ignore
            const assignment = await tx.staffTicketAssignment.create({
                data: {
                    staffId: parsed.staffId,
                    ticketTypeId: parsed.ticketTypeId,
                    ticketInventoryId: parsed.inventoryId,
                    seriesLabel: inventory.seriesLabel,
                    startNumber,
                    endNumber,
                    assignedCount: parsed.quantity,
                    status: 'Assigned',
                    assignedUpiMachineId: finalMachineId,
                    assignedDate: assignedDate
                }
            });

            await tx.ticketInventory.update({
                where: { id: inventory.id },
                data: {
                    currentNumber: endNumber + 1,
                    status: (endNumber === inventory.endNumber) ? 'Exhausted' : 'Available'
                }
            });

            return { success: true, assignment };
        });
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export async function updateStaffAssignment(data: z.infer<typeof updateAssignmentSchema>) {
    const session = await getSession();
    if (!session || !['Admin', 'Manager'].includes(session.roleName)) {
        return { success: false, error: 'Unauthorized' };
    }

    try {
        const parsed = updateAssignmentSchema.parse(data);

        // Determine UPI Machine
        let finalMachineId: number | null | undefined = parsed.assignedUpiMachineId;

        if (finalMachineId === -1) {
            // Explicit "Nil" selected
            finalMachineId = null;
        }

        // Determine Date
        const assignedDate = parsed.assignedDate ? new Date(parsed.assignedDate) : undefined;

        // Validate Future Date
        if (assignedDate) {
            const today = new Date();
            today.setHours(23, 59, 59, 999); // End of today
            if (assignedDate > today) {
                return { success: false, error: 'Cannot set a future date.' };
            }
        }

        await prisma.staffTicketAssignment.update({
            where: { id: parsed.assignmentId },
            data: {
                staffId: parsed.staffId,
                assignedUpiMachineId: finalMachineId,
                assignedDate: assignedDate
            }
        });

        revalidatePath('/dashboard/ticketing/staff');
        return { success: true };
    } catch (error: any) {
        console.error('Failed to update assignment:', error);
        return { success: false, error: error.message || 'Failed to update assignment' };
    }
}

export async function settleStaffAssignment(data: z.infer<typeof settlementSchema>) {
    const session = await getSession();
    if (!session || !['Admin', 'Manager'].includes(session.roleName)) {
        return { success: false, error: 'Unauthorized' };
    }

    try {
        const parsed = settlementSchema.parse(data);

        await prisma.$transaction(async (tx) => {
            const assignment = await tx.staffTicketAssignment.findUnique({
                where: { id: parsed.assignmentId },
                include: {
                    ticketType: {
                        include: {
                            ownerShares: true, // Fetch shares to split revenue
                            upiMachine: true // Fetch assigned machine
                        }
                    },
                    ticketInventory: true // Fetch inventory to get specific batch price
                }
            });
            if (!assignment) throw new Error('Assignment not found');
            if (assignment.status === 'Returned') throw new Error('Already settled');

            const settleDate = parsed.returnDate ? new Date(parsed.returnDate) : new Date();

            const soldCount = assignment.assignedCount - parsed.returnedCount;
            const price = assignment.ticketInventory?.price ?? assignment.ticketType.price;
            const expectedAmount = soldCount * price;

            // --- Profit Sharing Logic ---
            const ownerShares = assignment.ticketType.ownerShares || [];
            let totalOwnerShareAmount = 0;
            const upiMachine = assignment.ticketType.upiMachine;
            const isOwnerMaintainedMachine = upiMachine && !upiMachine.isCompanyOwned;

            // 1. Create Ledger Entries for Owners
            if (ownerShares.length > 0 && soldCount > 0) {
                for (const share of ownerShares) {
                    const shareAmount = (expectedAmount * share.sharePercentage) / 100;
                    totalOwnerShareAmount += shareAmount;

                    // Determine if THIS owner collected the money (via their UPI machine)
                    // If the machine belongs to this owner, they collected the FULL sales amount
                    let collectedByThisOwner = 0;
                    if (isOwnerMaintainedMachine && upiMachine.amusementOwnerId === share.amusementOwnerId) {
                        collectedByThisOwner = expectedAmount;
                    }

                    await tx.amusementLedger.create({
                        data: {
                            date: settleDate,
                            amusementOwnerId: share.amusementOwnerId,
                            ticketTypeId: assignment.ticketTypeId,
                            details: `${assignment.ticketType.name} - ${soldCount} tickets`,
                            soldCount: soldCount,
                            totalSales: expectedAmount,
                            ownerSharePercentage: share.sharePercentage,
                            ownerShareAmount: shareAmount,
                            companyShareAmount: expectedAmount - shareAmount,
                            collectedByOwner: collectedByThisOwner,
                            settledAssignmentId: assignment.id,
                            status: 'Pending'
                        }
                    });
                }
            }

            // 2. Day Book Entry for Company Share
            // If an Owner collected the money, the Company did NOT receive cash/bank deposit yet.
            // So we DO NOT create an Income Transaction in the Day Book to avoid inflating Cash Balance.
            // The "Asset" is now "Receivable from Owner", tracked in AmusementLedger.

            if (!isOwnerMaintainedMachine) {
                const companyShare = expectedAmount - totalOwnerShareAmount;

                // Format Description: "Torra Torra Rs.100 x Sold ticket count - balance percentage ie.70%"
                const companyPercentage = expectedAmount > 0
                    ? (companyShare / expectedAmount) * 100
                    : 100;

                await tx.transaction.create({
                    data: {
                        eventId: assignment.ticketType.eventId,
                        amount: companyShare,
                        type: 'Income',
                        category: 'Revenue Share', // Or 'Ticket Sales'
                        description: `${assignment.ticketType.name} - ${soldCount} tkts x ${assignment.ticketType.price} - Co. Share ${companyPercentage.toFixed(1)}%`,
                        paymentMethod: 'Cash', // Assumption for settlement
                        transactionDate: settleDate,
                        recordedBy: session.username
                    }
                });
            }

            // --- End Profit Sharing ---

            // Restock Unsold Tickets
            if (parsed.returnedCount > 0) {
                const soldEndNumber = assignment.startNumber + soldCount - 1;
                const returnStart = soldEndNumber + 1;
                const returnEnd = assignment.endNumber;

                if (returnStart <= returnEnd) {
                    await tx.ticketInventory.create({
                        data: {
                            eventId: assignment.ticketType.eventId || 0,
                            seriesLabel: assignment.seriesLabel.endsWith('(Ret)') ? assignment.seriesLabel : `${assignment.seriesLabel} (Ret)`,
                            startNumber: returnStart,
                            endNumber: returnEnd,
                            currentNumber: returnStart,
                            status: 'Available',
                            price: assignment.ticketType.price,
                            category: assignment.ticketType.category
                        }
                    });
                }
            }

            await tx.staffTicketAssignment.update({
                where: { id: parsed.assignmentId },
                data: {
                    status: 'Returned',
                    returnDate: settleDate,
                    returnedCount: parsed.returnedCount,
                    soldCount,
                    totalAmount: expectedAmount,
                    cashReceived: parsed.cashReceived,
                    upiReceived: parsed.upiReceived || 0,
                    difference: (parsed.cashReceived + (parsed.upiReceived || 0)) - expectedAmount
                }
            });
        });

        revalidatePath('/dashboard/ticketing/staff');
        return { success: true };
    } catch (error: any) {
        console.error('Settlement error:', error);
        return { success: false, error: error.message };
    }
}

export async function finalizeStaffSettlement(assignmentId: number) {
    const session = await getSession();
    if (!session || !['Admin', 'Manager'].includes(session.roleName)) {
        return { success: false, error: 'Unauthorized' };
    }

    try {
        await prisma.staffTicketAssignment.update({
            where: { id: assignmentId },
            data: {
                status: 'Settled',
                isSettled: true
            }
        });
        revalidatePath('/dashboard/ticketing');
        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export async function getStaffAssignments(eventId: number) {
    // Return active and recent assignments
    return await prisma.staffTicketAssignment.findMany({
        where: { staff: { eventId } },
        include: {
            staff: true,
            ticketType: true,
            ticketInventory: true
        },
        orderBy: { assignedDate: 'desc' }
    });
}

export async function undoStaffAssignment(assignmentId: number) {
    const session = await getSession();
    if (!session || !['Admin', 'Manager'].includes(session.roleName)) {
        return { success: false, error: 'Unauthorized' };
    }

    try {
        return await prisma.$transaction(async (tx) => {
            const assignment = await tx.staffTicketAssignment.findUnique({
                where: { id: assignmentId },
                include: { ticketInventory: true }
            });

            if (!assignment) throw new Error('Assignment not found');
            if (assignment.status !== 'Assigned') throw new Error('Cannot undo settled assignments.');

            const inventory = assignment.ticketInventory;
            if (!inventory) throw new Error('Inventory record missing.');

            // Check if this was the LATEST assignment from this inventory
            // Inventory currentNumber should be exactly (endNumber + 1)
            // Example: Assigned 1-10. End=10. Inv Current=11.
            if (inventory.currentNumber !== assignment.endNumber + 1) {
                throw new Error('Cannot undo: Subsequent assignments exist from this stock bundle. Please use Settlement instead.');
            }

            // Restore Inventory
            await tx.ticketInventory.update({
                where: { id: inventory.id },
                data: {
                    currentNumber: assignment.startNumber,
                    status: 'Available' // Ensure it's available if it was Exhausted
                }
            });

            // Delete Assignment
            await tx.staffTicketAssignment.delete({ where: { id: assignmentId } });

            return { success: true };
        });
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export async function bulkAssignTickets(assignments: {
    staffId: number;
    ticketTypeId: number;
    inventoryId: number;
    quantity: number;
    assignedDate: string;
    assignedUpiMachineId?: number;
}[]) {
    const session = await getSession();
    if (!session || !['Admin', 'Manager'].includes(session.roleName)) {
        return { success: false, error: 'Unauthorized' };
    }

    try {
        await prisma.$transaction(async (tx) => {
            const today = new Date();
            today.setHours(23, 59, 59, 999);

            for (const item of assignments) {
                const assignedDate = new Date(item.assignedDate);
                if (assignedDate > today) {
                    throw new Error(`Cannot backdate to future date: ${item.assignedDate}`);
                }

                // Inventory Validation
                const inventory = await tx.ticketInventory.findUnique({
                    where: { id: item.inventoryId }
                });

                if (!inventory) throw new Error(`Inventory item ${item.inventoryId} not found`);
                if (inventory.status !== 'Available') throw new Error(`Inventory item is not available (Status: ${inventory.status})`);

                const remaining = inventory.endNumber - inventory.currentNumber + 1;
                if (remaining < item.quantity) throw new Error(`Not enough stock. Requested: ${item.quantity}, Available: ${remaining}`);

                const startNumber = inventory.currentNumber;
                const endNumber = startNumber + item.quantity - 1;

                // Determine UPI Machine
                let upiMachineId: number | null = null;

                if (item.assignedUpiMachineId !== undefined) {
                    if (item.assignedUpiMachineId === -1) {
                        upiMachineId = null;
                    } else {
                        upiMachineId = item.assignedUpiMachineId;
                    }
                } else {
                    const ticketType = await tx.ticketType.findUnique({
                        where: { id: item.ticketTypeId },
                        select: { upiMachineId: true }
                    });
                    if (ticketType?.upiMachineId) {
                        upiMachineId = ticketType.upiMachineId;
                    }
                }

                // Create Assignment
                await tx.staffTicketAssignment.create({
                    data: {
                        staffId: item.staffId,
                        ticketTypeId: item.ticketTypeId,
                        ticketInventoryId: item.inventoryId,
                        assignedDate: assignedDate,
                        startNumber,
                        endNumber,
                        assignedCount: item.quantity,
                        seriesLabel: inventory.seriesLabel, // Add this
                        status: 'Assigned',
                        assignedUpiMachineId: upiMachineId
                    }
                });

                // Update Inventory
                const newRemaining = remaining - item.quantity;
                const newStatus = newRemaining === 0 ? 'Exhausted' : 'Available';
                await tx.ticketInventory.update({
                    where: { id: item.inventoryId },
                    data: {
                        currentNumber: endNumber + 1,
                        status: newStatus
                    }
                });
            }
        }, {
            maxWait: 10000,
            timeout: 60000
        });

        revalidatePath('/dashboard/ticketing');
        revalidatePath('/dashboard/accounts');
        return { success: true };
    } catch (error: any) {
        console.error('Error in bulk assignment:', error);
        return { success: false, error: error.message };
    }
}

export async function bulkSettleAssignments(settlements: {
    assignmentId: number;
    returnCount: number;
    cashReceived: number;
    upiReceived: number;
    returnDate: string;
}[]) {
    const session = await getSession();
    if (!session || !['Admin', 'Manager', 'Accountant'].includes(session.roleName)) {
        return { success: false, error: 'Unauthorized' };
    }

    try {
        await prisma.$transaction(async (tx) => {
            const today = new Date();
            today.setHours(23, 59, 59, 999);

            for (const item of settlements) {
                const settleDate = new Date(item.returnDate);
                if (settleDate > today) {
                    throw new Error(`Cannot settle in the future: ${item.returnDate}`);
                }

                const assignment = await tx.staffTicketAssignment.findUnique({
                    where: { id: item.assignmentId },
                    include: {
                        ticketType: {
                            include: {
                                ownerShares: {
                                    include: { amusementOwner: true }
                                },
                                amusementOwner: true
                            }
                        }
                    }
                });

                if (!assignment) throw new Error(`Assignment ${item.assignmentId} not found`);

                // Determine Mode
                const isFreshReturn = assignment.status === 'Assigned';
                const isUpdateSettlement = ['Returned', 'Settled'].includes(assignment.status);

                if (!isFreshReturn && !isUpdateSettlement) throw new Error(`Invalid status ${assignment.status} for settlement`);

                let soldCount = 0;
                let totalAmount = 0;

                if (isFreshReturn) {
                    if (item.returnCount < 0) throw new Error(`Invalid return count for ${assignment.id}`);
                    if (item.returnCount > assignment.assignedCount) throw new Error(`Return count exceeds assigned count for ${assignment.id}`);

                    soldCount = assignment.assignedCount - item.returnCount;
                    totalAmount = soldCount * assignment.ticketType.price;

                    // 1. Create Sale Record
                    const sale = await tx.ticketSale.create({
                        data: {
                            eventId: assignment.ticketType.eventId || 0,
                            totalAmount: totalAmount,
                            source: 'Staff',
                            createdAt: settleDate
                        }
                    });

                    // 2. Create Sale Items
                    const soldEndNumber = assignment.endNumber - item.returnCount;
                    if (soldCount > 0) {
                        const saleItemsData = [];
                        for (let i = assignment.startNumber; i <= soldEndNumber; i++) {
                            saleItemsData.push({
                                saleId: sale.id,
                                ticketTypeId: assignment.ticketTypeId,
                                ticketNumber: i,
                                price: assignment.ticketType.price
                            });
                        }
                        if (saleItemsData.length > 0) {
                            await tx.ticketSaleItem.createMany({
                                data: saleItemsData
                            });
                        }
                    }

                    // 2.5 Restock Unsold Tickets
                    if (item.returnCount > 0) {
                        const returnStart = soldEndNumber + 1;
                        const returnEnd = assignment.endNumber;

                        if (returnStart <= returnEnd) {
                            await tx.ticketInventory.create({
                                data: {
                                    eventId: assignment.ticketType.eventId || 0,
                                    seriesLabel: assignment.seriesLabel.endsWith('(Ret)') ? assignment.seriesLabel : `${assignment.seriesLabel} (Ret)`,
                                    startNumber: returnStart,
                                    endNumber: returnEnd,
                                    currentNumber: returnStart,
                                    status: 'Available',
                                    price: assignment.ticketType.price,
                                    category: assignment.ticketType.category
                                }
                            });
                        }
                    }
                } else {
                    // Update Mode: Trust existing Stock/Sale logic.
                    // We assume returnCount cannot change inventory here (safe mode).
                    // If user passed different returnCount, we ignore it or error. 
                    // Let's use DB values.
                    soldCount = assignment.soldCount || (assignment.assignedCount - (assignment.returnedCount || 0));
                    totalAmount = assignment.totalAmount || (soldCount * assignment.ticketType.price);

                    // Cleanup Old Financials
                    await tx.transaction.deleteMany({
                        where: {
                            description: { contains: `Settlement: ${assignment.ticketType.name} (Sold ${soldCount}) - Staff ${assignment.staffId}` },
                            transactionDate: assignment.settlementDate || undefined
                        }
                    });
                    await tx.uPITransaction.deleteMany({
                        where: { transactionId: { startsWith: `SETTLE-${assignment.id}-` } }
                    });

                    // Ledger? We should filter by date/details carefully
                    if (assignment.settlementDate) {
                        await tx.amusementLedger.deleteMany({
                            where: {
                                date: assignment.settlementDate,
                                ticketTypeId: assignment.ticketTypeId,
                                soldCount: soldCount
                            }
                        });
                    }
                }

                const difference = (item.cashReceived + item.upiReceived) - totalAmount;

                // 3. Update Assignment Status
                // If Fresh: Assigned -> Returned (Pending Settle) - Legacy behavior preserved
                // If Update: Returned -> Settled (Finalized)
                const nextStatus = isFreshReturn ? 'Returned' : 'Settled';
                const isSettledBool = !isFreshReturn;

                await tx.staffTicketAssignment.update({
                    where: { id: item.assignmentId },
                    data: {
                        status: nextStatus,
                        isSettled: isSettledBool,
                        returnedCount: isFreshReturn ? item.returnCount : undefined, // Only set on fresh
                        soldCount: soldCount,
                        totalAmount: totalAmount,
                        cashReceived: item.cashReceived,
                        upiReceived: item.upiReceived,
                        difference: difference,
                        settlementDate: settleDate,
                        returnDate: isFreshReturn ? settleDate : assignment.returnDate // Keep original return date if update
                    }
                });

                // 4. Ledger Split Logic (Duplicated from single action for robustness)
                const shares = assignment.ticketType.ownerShares;
                let totalOwnerSharePct = 0;
                let companySharePct = 100;

                if (shares.length > 0) {
                    totalOwnerSharePct = shares.reduce((sum, s) => sum + s.sharePercentage, 0);
                    companySharePct = 100 - totalOwnerSharePct;
                } else if (assignment.ticketType.amusementOwnerId) {
                    totalOwnerSharePct = assignment.ticketType.ownerSharePercentage;
                    companySharePct = 100 - totalOwnerSharePct;
                }
                const companyIncome = (totalAmount * companySharePct) / 100;

                if (item.cashReceived > 0) {
                    await tx.transaction.create({
                        data: {
                            eventId: assignment.ticketType.eventId || 0,
                            type: 'Income',
                            category: 'Ticket Sales',
                            amount: item.cashReceived,
                            paymentMethod: 'Cash',
                            description: `Settlement: ${assignment.ticketType.name} (Sold ${soldCount}) - Staff ${assignment.staffId}`,
                            transactionDate: settleDate
                        }
                    });
                }

                if (item.upiReceived > 0) {
                    await tx.transaction.create({
                        data: {
                            eventId: assignment.ticketType.eventId || 0,
                            type: 'Income',
                            category: 'Ticket Sales',
                            amount: item.upiReceived,
                            paymentMethod: 'UPI',
                            description: `Settlement: ${assignment.ticketType.name} (Sold ${soldCount}) - Staff ${assignment.staffId}`,
                            transactionDate: settleDate
                        }
                    });

                    if (assignment.assignedUpiMachineId) {
                        await tx.uPITransaction.create({
                            data: {
                                date: settleDate,
                                amount: item.upiReceived,
                                upiMachineId: assignment.assignedUpiMachineId,
                                transactionId: `SETTLE-${assignment.id}-${Date.now()}`,
                                status: 'Settlement'
                            }
                        });
                    }
                }

                if (shares.length > 0) {
                    for (const share of shares) {
                        const shareAmt = (totalAmount * share.sharePercentage) / 100;
                        await tx.amusementLedger.create({
                            data: {
                                date: settleDate,
                                amusementOwnerId: share.amusementOwnerId,
                                totalSales: totalAmount,
                                ownerShareAmount: shareAmt,
                                companyShareAmount: 0,
                                details: `Share from ${assignment.ticketType.name} (Sold ${soldCount})`,
                                status: 'Pending',
                                soldCount: soldCount,
                                ownerSharePercentage: share.sharePercentage,
                                ticketTypeId: assignment.ticketTypeId
                            }
                        });
                    }
                } else if (assignment.ticketType.amusementOwnerId) {
                    const shareAmt = (totalAmount * assignment.ticketType.ownerSharePercentage) / 100;
                    await tx.amusementLedger.create({
                        data: {
                            date: settleDate,
                            amusementOwnerId: assignment.ticketType.amusementOwnerId,
                            totalSales: totalAmount,
                            ownerShareAmount: shareAmt,
                            companyShareAmount: companyIncome,
                            details: `Share from ${assignment.ticketType.name} (Sold ${soldCount})`,
                            status: 'Pending',
                            soldCount: soldCount,
                            ownerSharePercentage: assignment.ticketType.ownerSharePercentage,
                            ticketTypeId: assignment.ticketTypeId
                        }
                    });
                }
            }
        }, {
            timeout: 120000 // 2 minutes
        });

        revalidatePath('/dashboard/ticketing');
        revalidatePath('/dashboard/accounts');
        return { success: true };
    } catch (error: any) {
        console.error('Error in recovery:', error);
        return { success: false, error: error.message };
    }
}

export async function undoSettlement(assignmentId: number) {
    const session = await getSession();
    if (!session || !['Admin', 'Manager'].includes(session.roleName)) {
        return { success: false, error: 'Unauthorized' };
    }

    try {
        await prisma.$transaction(async (tx) => {
            const assignment = await tx.staffTicketAssignment.findUnique({
                where: { id: assignmentId },
                include: { ticketType: true }
            });

            if (!assignment) throw new Error('Assignment not found');
            if (!['Settled', 'Returned'].includes(assignment.status)) throw new Error('Assignment is not settled or returned');

            // 1. Check & Remove Returned Stock
            // Logic: If returnedCount > 0, we likely created a TicketInventory.
            // Range: (endNumber - returnedCount + 1) to endNumber.
            // Series: Ends with (Ret)?
            const returnedCount = assignment.returnedCount || 0;
            if (returnedCount > 0) {
                const returnStart = assignment.endNumber - returnedCount + 1;
                const returnEnd = assignment.endNumber;

                const retInventory = await tx.ticketInventory.findFirst({
                    where: {
                        eventId: assignment.ticketType.eventId || 0,
                        startNumber: returnStart,
                        endNumber: returnEnd,
                        // seriesLabel: { endsWith: '(Ret)' }, // Not strictly required if range matches exactly
                        currentNumber: returnStart // MUST NOT HAVE BEEN USED
                    }
                });

                if (retInventory) {
                    // Safe to delete as it hasn't been used (current == start)
                    await tx.ticketInventory.delete({ where: { id: retInventory.id } });
                } else {
                    // Check if it exists but was used
                    const usedInventory = await tx.ticketInventory.findFirst({
                        where: {
                            eventId: assignment.ticketType.eventId || 0,
                            startNumber: returnStart,
                            endNumber: returnEnd
                        }
                    });
                    if (usedInventory && usedInventory.currentNumber !== returnStart) {
                        throw new Error(`Cannot undo: The returned stock (${returnStart}-${returnEnd}) has already been re-sold.`);
                    }
                }
            }

            // 2. Remove Financial Records
            // 2.1 UPI Transactions
            // We used transactionId: `SETTLE-${assignment.id}-${Date.now()}`
            // Searching with startsWith `SETTLE-${assignment.id}`
            await tx.uPITransaction.deleteMany({
                where: {
                    transactionId: { startsWith: `SETTLE-${assignment.id}` }
                }
            });

            // 2.2 Income Transactions 
            // Description: `Settlement: ${assignment.ticketType.name} (Sold ${soldCount}) - Staff ${assignment.staffId}`
            // Date: assignment.settlementDate
            if (assignment.settlementDate) {
                await tx.transaction.deleteMany({
                    where: {
                        transactionDate: assignment.settlementDate,
                        description: `Settlement: ${assignment.ticketType.name} (Sold ${assignment.soldCount}) - Staff ${assignment.staffId}`
                    }
                });

                // 2.3 Ledger Entries (AmusementLedger)
                // details: `Share from ${assignment.ticketType.name} (Sold ${soldCount})`
                // date: assignment.settlementDate
                // ticketTypeId: assignment.ticketTypeId
                await tx.amusementLedger.deleteMany({
                    where: {
                        date: assignment.settlementDate,
                        ticketTypeId: assignment.ticketTypeId,
                        soldCount: assignment.soldCount || 0, // Extra safety
                        details: { contains: `Share from ${assignment.ticketType.name}` }
                    }
                });
            }

            // 3. Remove Sales Records
            // We need to find the TicketSaleItem records.
            // Range: startNumber to (endNumber - returnedCount)
            const soldEndNumber = assignment.endNumber - returnedCount;
            if (soldEndNumber >= assignment.startNumber) {
                // Find items
                const saleItems = await tx.ticketSaleItem.findMany({
                    where: {
                        ticketTypeId: assignment.ticketTypeId,
                        ticketNumber: {
                            gte: assignment.startNumber,
                            lte: soldEndNumber
                        }
                    },
                    select: { id: true, saleId: true }
                });

                if (saleItems.length > 0) {
                    const saleIds = [...new Set(saleItems.map(i => i.saleId))];
                    // Delete Items
                    await tx.ticketSaleItem.deleteMany({
                        where: {
                            id: { in: saleItems.map(i => i.id) }
                        }
                    });

                    // Delete Orphaned Sales (TicketSale)
                    // Check if sale has other items?
                    for (const sId of saleIds) {
                        const remainingItems = await tx.ticketSaleItem.count({ where: { saleId: sId } });
                        if (remainingItems === 0) {
                            await tx.ticketSale.delete({ where: { id: sId } });
                        }
                    }
                }
            }

            // 4. Reset Assignment
            await tx.staffTicketAssignment.update({
                where: { id: assignmentId },
                data: {
                    status: 'Assigned',
                    returnDate: null,
                    settlementDate: null,
                    returnedCount: 0,
                    soldCount: 0,
                    totalAmount: 0,
                    cashReceived: 0,
                    upiReceived: 0
                }
            });
        }, { timeout: 20000 });

        revalidatePath('/dashboard/ticketing');
        revalidatePath('/dashboard/accounts');
        return { success: true };
    } catch (error: any) {
        console.error('Undo Settlement Error:', error);
        return { success: false, error: error.message };
    }
}

export async function recoverHistoricalReturns(eventId: number) {
    const session = await getSession();
    if (!session || !['Admin', 'Manager'].includes(session.roleName)) {
        return { success: false, error: 'Unauthorized' };
    }

    try {
        const assignments = await prisma.staffTicketAssignment.findMany({
            where: {
                ticketType: { eventId },
                OR: [
                    { status: 'Returned' },
                    { status: 'Settled' }
                ],
                returnedCount: { gt: 0 }
            },
            include: { ticketType: true }
        });

        let restoredCount = 0;

        for (const assign of assignments) {
            // Check if stock exists
            const soldCount = assign.assignedCount - (assign.returnedCount || 0);
            const soldEndNumber = assign.startNumber + soldCount - 1;
            const returnStart = soldEndNumber + 1;
            const returnEnd = assign.endNumber;

            if (returnStart > returnEnd) continue;

            // Check overlap
            const overlap = await prisma.ticketInventory.findFirst({
                where: {
                    eventId: assign.ticketType.eventId,
                    startNumber: { lte: returnEnd },
                    endNumber: { gte: returnStart }
                }
            });

            if (!overlap) {
                await prisma.ticketInventory.create({
                    data: {
                        eventId: assign.ticketType.eventId || 0,
                        seriesLabel: assign.seriesLabel.endsWith('(Ret)') ? assign.seriesLabel : `${assign.seriesLabel} (Ret)`,
                        startNumber: returnStart,
                        endNumber: returnEnd,
                        currentNumber: returnStart,
                        status: 'Available',
                        price: assign.ticketType.price,
                        category: assign.ticketType.category
                    }
                });
                restoredCount++;
            }
        }

        revalidatePath('/dashboard/ticketing');
        return { success: true, count: restoredCount };
    } catch (error: any) {
        console.error('Recovery Error', error);
        return { success: false, error: error.message };
    }
}

export async function updateStaffSettlementAmount(data: { assignmentId: number, cashReceived: number, upiReceived: number }) {
    const session = await getSession();
    if (!session) return { success: false, error: 'Unauthorized' };

    try {
        const assign = await prisma.staffTicketAssignment.findUnique({
            where: { id: data.assignmentId },
            include: { ticketType: true }
        });

        if (!assign) return { success: false, error: 'Assignment not found' };

        const expectedAmount = (assign.soldCount || 0) * assign.ticketType.price;
        const totalCollected = data.cashReceived + data.upiReceived;
        const difference = totalCollected - expectedAmount;

        await prisma.staffTicketAssignment.update({
            where: { id: data.assignmentId },
            data: {
                cashReceived: data.cashReceived,
                upiReceived: data.upiReceived,
                difference: difference
            }
        });

        revalidatePath('/dashboard/ticketing/staff');
        return { success: true };
    } catch (e) {
        console.error('Update settlement error:', e);
        return { success: false, error: 'Update failed' };
    }
}

export async function recalculatePastSettlements() {
    const session = await getSession();
    // if (!session || session.role !== 'ADMIN') return { success: false, error: 'Unauthorized' }; // Optional security

    try {
        const assignments = await prisma.staffTicketAssignment.findMany({
            where: { status: 'Settled' },
            include: { ticketType: true, staff: true }
        });

        // Group by Staff + Returned Date + Price (Proxy for Batch)
        const groups: Record<string, typeof assignments> = {};
        assignments.forEach(a => {
            const dateStr = a.returnDate ? new Date(a.returnDate).toISOString().split('T')[0] : 'Unknown';
            const key = `${a.staffId}-${dateStr}-${a.ticketType.price}`;
            if (!groups[key]) groups[key] = [];
            groups[key].push(a);
        });

        let updatedCount = 0;

        for (const key in groups) {
            const group = groups[key];

            // Calculate Total Cash/UPI for the group
            let totalCash = 0;
            let totalUpi = 0;

            group.forEach(a => {
                totalCash += (a.cashReceived || 0);
                totalUpi += (a.upiReceived || 0);
            });

            // Re-distribute using Waterfall
            let remainingCash = totalCash;
            let remainingUpi = totalUpi;

            // Sort to ensure deterministic order (e.g. by ID)
            group.sort((a, b) => a.id - b.id);

            for (let i = 0; i < group.length; i++) {
                const item = group[i];
                const isLast = i === group.length - 1;
                const soldVal = (item.assignedCount - (item.returnedCount || 0)) * item.ticketType.price;

                let allocatedUpi = 0;
                let allocatedCash = 0;
                let needed = soldVal;

                // 1. UPI
                const upiTake = Math.min(remainingUpi, needed);
                allocatedUpi += upiTake;
                remainingUpi -= upiTake;
                needed -= upiTake;

                // 2. Cash
                const cashTake = Math.min(remainingCash, needed);
                allocatedCash += cashTake;
                remainingCash -= cashTake;
                needed -= cashTake;

                // 3. Excess to Last
                if (isLast) {
                    if (remainingUpi > 0.001) allocatedUpi += remainingUpi; // tolerance for float
                    if (remainingCash > 0.001) allocatedCash += remainingCash;
                }

                // Update if changed significantly
                if (Math.abs((item.cashReceived || 0) - allocatedCash) > 0.01 || Math.abs((item.upiReceived || 0) - allocatedUpi) > 0.01) {
                    // Recalc difference
                    const expected = soldVal;
                    const collected = allocatedCash + allocatedUpi;
                    const diff = collected - expected;

                    await prisma.staffTicketAssignment.update({
                        where: { id: item.id },
                        data: {
                            cashReceived: allocatedCash,
                            upiReceived: allocatedUpi,
                            difference: diff
                        }
                    });
                    updatedCount++;
                }
            }
        }

        revalidatePath('/dashboard/ticketing/staff');
        return { success: true, count: updatedCount };
    } catch (e) {
        console.error('Recalculation error:', e);
        return { success: false, error: 'Recalculation failed' };
    }
}
