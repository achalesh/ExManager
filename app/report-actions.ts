'use server';

import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';

export async function getEventReport(eventId: number) {
    const session = await getSession();

    if (!session) {
        return null;
    }

    const [event, spaces, bookings, exhibitors, materialAllocations, electricalAllocations, shedAllocations] = await Promise.all([
        prisma.event.findUnique({
            where: { id: eventId },
            include: {
                _count: {
                    select: { spaces: true, bookings: true }
                }
            }
        }),
        prisma.space.findMany({
            where: { eventId },
            include: { category: true }
        }),
        prisma.booking.findMany({
            where: { eventId },
            include: {
                space: { include: { category: true } },
                exhibitor: true
            }
        }),
        prisma.exhibitor.findMany({
            include: {
                bookings: {
                    where: { eventId },
                    include: { space: { include: { category: true } } }
                }
            }
        }),
        prisma.materialAllocation.findMany({
            where: { eventId },
            include: { material: true, exhibitor: true }
        }),
        prisma.electricalAllocation.findMany({
            where: { eventId },
            include: { electricalItem: true, exhibitor: true }
        }),
        prisma.shedAllocation.findMany({
            where: { eventId },
            include: { shed: true, exhibitor: true }
        })
    ]);

    if (!event) return null;

    // Calculate statistics
    const totalSpaces = spaces.length;
    const bookedSpaces = spaces.filter(s => s.status === 'Booked').length;
    const availableSpaces = spaces.filter(s => s.status === 'Available').length;
    const occupancyRate = totalSpaces > 0 ? (bookedSpaces / totalSpaces) * 100 : 0;

    // Revenue calculations
    const spaceRevenue = bookings.reduce((sum, b) => sum + b.totalAmount, 0);
    const materialRevenue = materialAllocations.reduce((sum, a) => sum + a.totalPrice, 0);
    const electricalRevenue = electricalAllocations.reduce((sum, a) => sum + a.totalPrice, 0);
    const shedRevenue = shedAllocations.reduce((sum, a) => sum + a.price, 0);
    const totalRevenue = spaceRevenue + materialRevenue + electricalRevenue + shedRevenue;

    // Allocation counts
    const totalMaterialAllocations = materialAllocations.length;
    const totalElectricalAllocations = electricalAllocations.length;
    const totalShedAllocations = shedAllocations.length;
    const totalWattage = electricalAllocations.reduce((sum, a) => sum + a.totalWattage, 0);

    // Exhibitor statistics
    const totalExhibitors = exhibitors.filter(e => e.bookings.length > 0).length;
    const totalAdvancePaid = exhibitors.reduce((sum, e) => sum + e.advancePaid, 0);

    // Category breakdown
    const categoryBreakdown = spaces.reduce((acc: any, space) => {
        const catName = space.category.name;
        if (!acc[catName]) {
            acc[catName] = { total: 0, booked: 0, available: 0, revenue: 0 };
        }
        acc[catName].total++;
        if (space.status === 'Booked') {
            acc[catName].booked++;
            const booking = bookings.find(b => b.spaceId === space.id);
            if (booking) acc[catName].revenue += booking.totalAmount;
        } else if (space.status === 'Available') {
            acc[catName].available++;
        }
        return acc;
    }, {});

    return {
        event,
        statistics: {
            totalSpaces,
            bookedSpaces,
            availableSpaces,
            occupancyRate: Math.round(occupancyRate * 100) / 100,
            totalExhibitors,
            totalRevenue,
            spaceRevenue,
            materialRevenue,
            electricalRevenue,
            shedRevenue,
            totalAdvancePaid,
            totalMaterialAllocations,
            totalElectricalAllocations,
            totalShedAllocations,
            totalWattage,
        },
        categoryBreakdown,
        bookings,
        materialAllocations,
        electricalAllocations,
        shedAllocations,
    };
}

export async function getExhibitorReport(eventId: number) {
    const session = await getSession();

    if (!session) {
        return [];
    }

    const exhibitors = await prisma.exhibitor.findMany({
        include: {
            bookings: {
                where: { eventId },
                include: {
                    space: {
                        include: { category: true }
                    }
                }
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
            payments: {
                where: { invoice: { eventId } }
            }
        }
    });

    // Calculate totals for each exhibitor
    return exhibitors.map(exhibitor => {
        const spaceTotal = exhibitor.bookings.reduce((sum, b) => sum + b.totalAmount, 0);
        const materialTotal = exhibitor.materialAllocations.reduce((sum, a) => sum + a.totalPrice, 0);
        const electricalTotal = exhibitor.electricalAllocations.reduce((sum, a) => sum + a.totalPrice, 0);
        const shedTotal = exhibitor.shedAllocations.reduce((sum, a) => sum + a.price, 0);
        const totalCost = spaceTotal + materialTotal + electricalTotal + shedTotal;

        // Calculate Total Paid
        const paymentsTotal = exhibitor.payments.reduce((sum, p) => sum + p.amount, 0);
        const totalPaid = paymentsTotal + exhibitor.advancePaid;

        const balance = totalCost - totalPaid;

        return {
            ...exhibitor,
            totals: {
                spaceTotal,
                materialTotal,
                electricalTotal,
                shedTotal,
                totalCost,
                advancePaid: exhibitor.advancePaid,
                totalPaid,
                balance,
            }
        };
    }).filter(e => e.bookings.length > 0); // Only exhibitors with bookings
}

export async function getPaymentReport(eventId: number) {
    const session = await getSession();

    if (!session) {
        return [];
    }

    const payments = await prisma.payment.findMany({
        where: {
            OR: [
                { invoice: { eventId } }, // Payments linked to event invoices
                {
                    // Or payments linked to exhibitors of this event (if direct linkage is missing, fallback)
                    // The schema shows Payment has optional invoiceId.
                    // If invoiceId is null, we might rely on exhibitor.bookings for event context?
                    // Actually, the schema doesn't have eventId on Payment. 
                    // But our recordPayment puts it on invoice? Or does it?
                    // recordPayment doesn't seem to link to Invoice in the code I saw! 
                    // Wait, `recordPayment` in `payment-actions.ts` (lines 40-52) does NOT set invoiceId.
                    // It only sets exhibitorId. 
                    // This is a data model issue.
                    // However, we can filter by exhibitors who are part of this event.
                    exhibitor: {
                        bookings: {
                            some: { eventId }
                        }
                    }
                }
            ]
        },
        include: {
            exhibitor: {
                select: {
                    name: true,
                    faciaName: true,
                    bookings: {
                        where: { eventId },
                        include: { space: true }
                    }
                }
            }
        },
        orderBy: {
            paymentDate: 'desc'
        }
    });

    return payments.map(p => ({
        ...p,
        exhibitorName: p.exhibitor.faciaName || p.exhibitor.name,
        space: p.exhibitor.bookings.map(b => b.space.label).join(', ')
    }));
}

export async function getAllocationSummary(eventId: number) {
    const session = await getSession();

    if (!session) {
        return null;
    }

    const [materials, electrical, sheds] = await Promise.all([
        prisma.materialAllocation.findMany({
            where: { eventId },
            include: {
                material: true,
                exhibitor: true
            }
        }),
        prisma.electricalAllocation.findMany({
            where: { eventId },
            include: {
                electricalItem: true,
                exhibitor: true
            }
        }),
        prisma.shedAllocation.findMany({
            where: { eventId },
            include: {
                shed: true,
                exhibitor: true
            }
        })
    ]);

    // Group by resource type
    const materialSummary = materials.reduce((acc: any, alloc) => {
        const key = alloc.material.name;
        if (!acc[key]) {
            acc[key] = {
                name: alloc.material.name,
                unit: alloc.material.unit,
                totalQuantity: 0,
                totalCost: 0,
                allocations: 0
            };
        }
        acc[key].totalQuantity += alloc.quantity;
        acc[key].totalCost += alloc.totalPrice;
        acc[key].allocations++;
        return acc;
    }, {});

    const electricalSummary = electrical.reduce((acc: any, alloc) => {
        const key = alloc.electricalItem.name;
        if (!acc[key]) {
            acc[key] = {
                name: alloc.electricalItem.name,
                wattage: alloc.electricalItem.wattage,
                totalQuantity: 0,
                totalWattage: 0,
                totalCost: 0,
                allocations: 0
            };
        }
        acc[key].totalQuantity += alloc.quantity;
        acc[key].totalWattage += alloc.totalWattage;
        acc[key].totalCost += alloc.totalPrice;
        acc[key].allocations++;
        return acc;
    }, {});

    const shedSummary = sheds.reduce((acc: any, alloc) => {
        const key = alloc.shed.name;
        if (!acc[key]) {
            acc[key] = {
                name: alloc.shed.name,
                dimensions: alloc.shed.dimensions,
                totalCost: 0,
                allocations: 0
            };
        }
        acc[key].totalCost += alloc.price;
        acc[key].allocations++;
        return acc;
    }, {});

    return {
        materials: Object.values(materialSummary),
        electrical: Object.values(electricalSummary),
        sheds: Object.values(shedSummary),
    };
}
