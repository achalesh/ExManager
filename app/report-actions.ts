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

export async function getPaymentReport(eventId: number, filters?: {
    page?: number;
    pageSize?: number;
    search?: string;
    category?: string;
    method?: string;
    date?: string;
}) {
    const session = await getSession();

    if (!session) {
        return {
            payments: [],
            pagination: { currentPage: 1, totalPages: 0, totalItems: 0 },
            summary: { totalAmount: 0, totalCash: 0, totalUPI: 0 }
        };
    }

    const page = filters?.page || 1;
    const pageSize = filters?.pageSize || 20;
    const skip = (page - 1) * pageSize;

    // Construct Where Clause
    const where: any = {
        AND: [
            {
                OR: [
                    { invoice: { eventId } },
                    {
                        exhibitor: {
                            bookings: {
                                some: { eventId }
                            }
                        }
                    }
                ]
            }
        ]
    };

    // Add Filters
    if (filters?.search) {
        const search = filters.search.trim();
        if (search) {
            where.AND.push({
                OR: [
                    { receiptNumber: { contains: search } }, // SQLite is case-insensitive by default roughly? No, need mode usually. Prisma simplified?
                    // For SQLite/Postgres compatibility usually use mode: insensitive if supported or just contains
                    { receiptNumber: { contains: search } },
                    { exhibitor: { name: { contains: search } } },
                    { exhibitor: { faciaName: { contains: search } } }
                ]
            });
        }
    }

    if (filters?.category && filters.category !== 'All') {
        where.AND.push({ category: filters.category });
    }

    if (filters?.method && filters.method !== 'All') {
        where.AND.push({ paymentMethod: filters.method });
    }

    if (filters?.date) {
        const d = new Date(filters.date);
        const start = new Date(d.setHours(0, 0, 0, 0));
        const end = new Date(d.setHours(23, 59, 59, 999));
        where.AND.push({
            paymentDate: {
                gte: start,
                lte: end
            }
        });
    }

    // 1. Get Total Count
    const totalItems = await prisma.payment.count({ where });

    // 2. Get Paginated Data
    const payments = await prisma.payment.findMany({
        where,
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
        orderBy: { paymentDate: 'desc' },
        skip,
        take: pageSize
    });

    // 3. Get Summary (Aggregates for the WHOLE filtered set, not just page)
    // Prisma aggregate is fast enough usually
    const aggregates = await prisma.payment.groupBy({
        by: ['paymentMethod'],
        where,
        _sum: {
            amount: true
        }
    });

    let totalAmount = 0;
    let totalCash = 0;
    let totalUPI = 0;

    aggregates.forEach(agg => {
        const amt = agg._sum.amount || 0;
        totalAmount += amt;
        const method = (agg.paymentMethod || '').toLowerCase();
        if (method.includes('cash')) totalCash += amt;
        else totalUPI += amt; // Broad categorization, adjust if 'Cheque' maps elsewhere
        // Usually Cheque/Bank is 'Other', but for Cash/UPI split:
        // Client side logic was: includes('cash') -> Cash, else UPI.
        // We should stick to that, or strictly map 'UPI' to UPI.
        // Let's stick to the client logic: Cash is Cash, everything else (UPI, Cheque, Bank) is "Bank/Online" usually, but label says UPI.
        // Let's refine:
        // Cash = includes 'cash'
        // UPI = includes 'upi'
        // Others?
        // Let's simply sum 'Cash' as Cash, and everything else in Total.
        // The previous UI had Cash and UPI columns.
    });

    // Map to View Model
    const mappedPayments = payments.map(p => ({
        ...p,
        exhibitorName: p.exhibitor.faciaName || p.exhibitor.name,
        space: p.exhibitor.bookings.map(b => b.space.label).join(', ')
    }));

    return {
        payments: mappedPayments,
        pagination: {
            currentPage: page,
            pageSize,
            totalPages: Math.ceil(totalItems / pageSize),
            totalItems
        },
        summary: {
            totalAmount,
            totalCash,
            totalUPI
        }
    };
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
