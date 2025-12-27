'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { join } from 'path';
import { writeFile, mkdir } from 'fs/promises';
import { cwd } from 'process';

const eventSchema = z.object({
    name: z.string().min(2, "Name must be at least 2 characters"),
    location: z.string().min(2, "Location must be at least 2 characters"),
    startDate: z.string(),
    endDate: z.string(),
});

const categorySchema = z.object({
    name: z.string().min(2),
    price: z.coerce.number().min(0),
    shape: z.string(),
    dimensions: z.string(),
});

const spaceSchema = z.object({
    label: z.string(),
    eventId: z.coerce.number(),
    categoryId: z.coerce.number(),
});

const exhibitorSchema = z.object({
    name: z.string().min(2),
    contact: z.string().min(2),
    phone: z.string().min(2),
    email: z.string().email(),
    faciaName: z.string().default(""),
    productCategory: z.string().default(""),
    idProof: z.string().default(""),
    secondaryPhone: z.string().default(""),
    address: z.string().default(""),
    advancePaid: z.number().default(0),
    isPhysicalFormSubmitted: z.boolean().default(false),
});

const bookingSchema = z.object({
    eventId: z.coerce.number(),
    spaceId: z.coerce.number(),
    exhibitorId: z.coerce.number(),
    totalAmount: z.coerce.number(),
});

type EventData = z.infer<typeof eventSchema>;
type CategoryData = z.infer<typeof categorySchema>;
type SpaceData = z.infer<typeof spaceSchema>;
type ExhibitorData = z.infer<typeof exhibitorSchema>;
type BookingData = z.infer<typeof bookingSchema>;

export async function createEvent(formData: FormData) {
    try {
        const data = {
            name: formData.get('name') as string,
            location: formData.get('location') as string,
            startDate: formData.get('startDate') as string,
            endDate: formData.get('endDate') as string,
        };
        const status = (formData.get('status') as string) || 'Upcoming';

        const parsed = eventSchema.parse(data);

        const logo = formData.get('logo') as File | null;
        let logoUrl = null;

        if (logo && logo.size > 0) {
            const buffer = Buffer.from(await logo.arrayBuffer());
            const filename = `${Date.now()}_${logo.name.replace(/\s/g, '_')}`;
            const uploadDir = join(cwd(), 'public', 'uploads', 'events');
            await mkdir(uploadDir, { recursive: true });
            await writeFile(join(uploadDir, filename), buffer);
            logoUrl = `/uploads/events/${filename}`;
        }

        await prisma.event.create({
            data: {
                name: parsed.name,
                location: parsed.location,
                startDate: new Date(parsed.startDate),
                endDate: new Date(parsed.endDate),
                status: status,
                logo: logoUrl,
            },
        });
        revalidatePath('/');
        revalidatePath('/dashboard');
        revalidatePath('/dashboard/admin/events');
        return { success: true };
    } catch (error) {
        console.error('Error creating event:', error);
        return { success: false, error: 'Failed to create event' };
    }
}

export async function getEvents() {
    return await prisma.event.findMany({
        orderBy: { startDate: 'desc' },
        include: {
            _count: {
                select: { spaces: true }
            }
        }
    });
}

export async function getEvent(id: number) {
    return await prisma.event.findUnique({
        where: { id },
        include: {
            spaces: {
                include: {
                    category: true,
                    bookings: {
                        include: {
                            exhibitor: true
                        }
                    }
                }
            }
        }
    });
}

// Category Actions
export async function createCategory(data: CategoryData) {
    const parsed = categorySchema.parse(data);
    await prisma.spaceCategory.create({
        data: {
            name: parsed.name,
            price: parsed.price,
            shape: parsed.shape,
            dimensions: parsed.dimensions
        }
    });
    revalidatePath('/events/[id]');
}

export async function getCategories() {
    return await prisma.spaceCategory.findMany();
}

// Space Actions
export async function createSpace(data: SpaceData) {
    const parsed = spaceSchema.parse(data);
    await prisma.space.create({
        data: {
            label: parsed.label,
            eventId: parsed.eventId,
            categoryId: parsed.categoryId,
            status: 'Available'
        }
    });
    revalidatePath(`/events/${parsed.eventId}`);
}

export async function getSpaces(eventId: number) {
    return await prisma.space.findMany({
        where: { eventId },
        include: { category: true }
    });
}

// Exhibitor Actions
export async function createExhibitor(data: ExhibitorData) {
    const parsed = exhibitorSchema.parse(data);
    const exhibitor = await prisma.exhibitor.create({
        data: {
            name: parsed.name,
            contact: parsed.contact,
            phone: parsed.phone,
            email: parsed.email,
            faciaName: parsed.faciaName || "",
            productCategory: parsed.productCategory || "",
            idProof: parsed.idProof || "",
            secondaryPhone: parsed.secondaryPhone || "",
            address: parsed.address || "",
            advancePaid: parsed.advancePaid || 0,
            isPhysicalFormSubmitted: parsed.isPhysicalFormSubmitted || false,
        }
    });
    revalidatePath('/dashboard');
    revalidatePath('/dashboard/exhibitors');
    revalidatePath('/dashboard/register-exhibitor');
    return exhibitor;
}

export async function getExhibitors() {
    return await prisma.exhibitor.findMany({
        orderBy: { name: 'asc' }
    });
}

export async function createBooking(data: BookingData) {
    const parsed = bookingSchema.parse(data);

    // Transaction to create booking and update space status
    await prisma.$transaction([
        prisma.booking.create({
            data: {
                eventId: parsed.eventId,
                spaceId: parsed.spaceId,
                exhibitorId: parsed.exhibitorId,
                totalAmount: parsed.totalAmount,
            }
        }),
        prisma.space.update({
            where: { id: parsed.spaceId },
            data: { status: 'Booked' }
        })
    ]);

    revalidatePath(`/events/${parsed.eventId}`);
}
