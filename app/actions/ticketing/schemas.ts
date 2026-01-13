import { z } from 'zod';

// --- Schema Definitions ---

export const ticketSaleSchema = z.object({
    eventId: z.coerce.number(),
    items: z.array(z.object({
        ticketTypeId: z.coerce.number(),
        quantity: z.coerce.number().min(1),
    })),
});
