'use server';

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function getBillingSummary(eventId: number) {
    const exhibitors = await prisma.exhibitor.findMany({
        include: {
            invoices: {
                where: { eventId }
            },
            payments: {
                where: { invoice: { eventId } }
            },
            bookings: { where: { eventId } },
            materialAllocations: { where: { eventId } },
            electricalAllocations: { where: { eventId } },
            shedAllocations: { where: { eventId } },
        }
    });

    return exhibitors.map(ex => {
        // Calculate total cost from allocations if no invoice exists, or use invoice grand total
        // But logic should be: Total Cost = Sum of all allocations.
        // Invoice Amount = Sum of all generated invoices. 
        // Collected = Sum of all payments.
        // Pending = Total Cost - Collected.

        const spaceCost = ex.bookings.reduce((sum, b) => sum + b.totalAmount, 0);
        const materialCost = ex.materialAllocations.reduce((sum, m) => sum + m.totalPrice, 0);
        const electricalCost = ex.electricalAllocations.reduce((sum, e) => sum + e.totalPrice, 0);
        const shedCost = ex.shedAllocations.reduce((sum, s) => sum + s.price, 0);

        const totalCost = spaceCost + materialCost + electricalCost + shedCost;
        const totalInvoiced = ex.invoices.reduce((sum, i) => sum + i.grandTotal, 0);
        const totalPaid = ex.payments.reduce((sum, p) => sum + p.amount, 0) + ex.advancePaid;

        return {
            id: ex.id,
            name: ex.name,
            stallName: ex.faciaName,
            contact: ex.contact,
            totalCost,
            totalInvoiced,
            totalPaid,
            balance: totalCost - totalPaid,
            status: totalCost - totalPaid <= 0 ? 'Settled' : 'Pending',
            lastInvoiceDate: ex.invoices.length > 0 ? ex.invoices[ex.invoices.length - 1].createdAt : null,
        };
    });
}

export async function getExhibitorBillingDetails(exhibitorId: number, eventId: number) {
    const exhibitor = await prisma.exhibitor.findUnique({
        where: { id: exhibitorId },
        include: {
            invoices: {
                where: { eventId },
                orderBy: { createdAt: 'desc' }
            },
            payments: {
                orderBy: { paymentDate: 'desc' }
            },
            bookings: {
                where: { eventId },
                include: { space: true }
            },
            materialAllocations: {
                where: { eventId },
                include: { material: true }
            },
            electricalAllocations: {
                where: { eventId },
                include: { electricalItem: true }
            },
            shedAllocations: {
                where: { eventId },
                include: { shed: true }
            },
        }
    });

    if (!exhibitor) return null;

    const spaceCost = exhibitor.bookings.reduce((sum, b) => sum + b.totalAmount, 0);
    const materialCost = exhibitor.materialAllocations.reduce((sum, m) => sum + m.totalPrice, 0);
    const electricalCost = exhibitor.electricalAllocations.reduce((sum, e) => sum + e.totalPrice, 0);
    const shedCost = exhibitor.shedAllocations.reduce((sum, s) => sum + s.price, 0);
    const totalCost = spaceCost + materialCost + electricalCost + shedCost;

    // Calculate payments by category
    const payments = exhibitor.payments as any[];
    const spacePaid = payments.filter(p => p.category === 'Rent' || p.category === 'Space').reduce((sum: number, p: any) => sum + p.amount, 0);
    const materialPaid = payments.filter(p => p.category === 'Material').reduce((sum: number, p: any) => sum + p.amount, 0);
    const electricalPaid = payments.filter(p => p.category === 'Electrical').reduce((sum: number, p: any) => sum + p.amount, 0);
    const shedPaid = payments.filter(p => p.category === 'Shed').reduce((sum: number, p: any) => sum + p.amount, 0);
    const generalPaid = payments.filter(p => p.category === 'General' || !['Rent', 'Space', 'Material', 'Electrical', 'Shed'].includes(p.category)).reduce((sum: number, p: any) => sum + p.amount, 0) + exhibitor.advancePaid;

    // Total Paid is sum of all
    const totalPaid = spacePaid + materialPaid + electricalPaid + shedPaid + generalPaid;

    const event = await prisma.event.findUnique({ where: { id: eventId } });

    return {
        ...exhibitor,
        event,
        costs: {
            space: spaceCost,
            material: materialCost,
            electrical: electricalCost,
            shed: shedCost,
            total: totalCost
        },
        paid: {
            space: spacePaid,
            material: materialPaid,
            electrical: electricalPaid,
            shed: shedPaid,
            general: generalPaid,
            total: totalPaid
        }
    };
}

export async function generateInvoice(exhibitorId: number, eventId: number) {
    // 1. Calculate current totals
    const details = await getExhibitorBillingDetails(exhibitorId, eventId);
    if (!details) return { success: false, error: "Exhibitor not found" };

    const { space, material, electrical, shed, total } = details.costs;

    // 2. Create Invoice Record
    // Simple increment for invoice number logic (not concurrency safe strictly but okay for MVP)
    const count = await prisma.invoice.count();
    const invoiceNumber = `INV-${new Date().getFullYear()}-${(count + 1).toString().padStart(4, '0')}`;

    const invoice = await prisma.invoice.create({
        data: {
            invoiceNumber,
            exhibitorId,
            eventId,
            spaceTotal: space,
            materialTotal: material,
            electricalTotal: electrical,
            shedTotal: shed,
            subtotal: total,
            grandTotal: total, // tax/discount logic pending
            status: 'Unpaid'
        }
    });

    revalidatePath(`/dashboard/billing/${exhibitorId}`);
    revalidatePath('/dashboard/billing');
    return { success: true, invoice };
}

export async function recordPayment(data: {
    exhibitorId: number;
    amount: number;
    method: string;
    reference?: string;
    notes?: string;
    invoiceId?: number;
}) {

    await prisma.payment.create({
        data: {
            receiptNumber: `RCP-${Date.now().toString().slice(-6)}`, // simple unique gen
            exhibitorId: data.exhibitorId,
            invoiceId: data.invoiceId, // Optional link
            amount: data.amount,
            paymentMethod: data.method,
            referenceNumber: data.reference,
            notes: data.notes,
        }
    });

    // If linked to invoice, check specific invoice status
    if (data.invoiceId) {
        const invoice = await prisma.invoice.findUnique({
            where: { id: data.invoiceId },
            include: { payments: true }
        });

        if (invoice) {
            // This payment isn't in 'payments' yet maybe? No, it is.
            // Wait, we just created it but didn't verify relation update immediately if using read-after-write caveat.
            // Let's sum manully including new amount.
            const totalPaid = invoice.payments.reduce((sum, p) => sum + p.amount, 0) + data.amount;

            let newStatus = 'Unpaid';
            if (totalPaid >= invoice.grandTotal) newStatus = 'Paid';
            else if (totalPaid > 0) newStatus = 'Partial';

            await prisma.invoice.update({
                where: { id: invoice.id },
                data: { status: newStatus }
            });
        }
    }

    revalidatePath(`/dashboard/billing/${data.exhibitorId}`);
    revalidatePath('/dashboard/billing');
    return { success: true };
}
