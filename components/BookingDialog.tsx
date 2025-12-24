'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Check, ChevronsUpDown, UserPlus } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from "@/components/ui/command"
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { createBooking, createExhibitor, getExhibitors } from '@/app/actions';
import { cn } from '@/lib/utils';
import { Space, SpaceCategory, Exhibitor, Booking } from '@prisma/client';

const formSchema = z.object({
    exhibitorId: z.number().min(1, "Please select an exhibitor"),
});

const newExhibitorSchema = z.object({
    name: z.string().min(2, "Name is required"),
    faciaName: z.string(),
    productCategory: z.string(),
    idProof: z.string(),
    contact: z.string().min(2, "Contact person is required"),
    phone: z.string().min(2, "Phone is required"),
    secondaryPhone: z.string(),
    address: z.string(),
    email: z.string().email(),
    advancePaid: z.number(),
    isPhysicalFormSubmitted: z.boolean(),
});

interface BookingDialogProps {
    space: Space & {
        category: SpaceCategory;
        bookings: (Booking & { exhibitor: Exhibitor })[];
    };
    eventId: number;
}

export function BookingDialog({ space, eventId }: BookingDialogProps) {
    const [open, setOpen] = useState(false);
    const [exhibitors, setExhibitors] = useState<Exhibitor[]>([]);
    const [exhibitorOpen, setExhibitorOpen] = useState(false);
    const [showNewExhibitor, setShowNewExhibitor] = useState(false);

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            exhibitorId: 0,
        },
    });

    const newExhibitorForm = useForm<z.infer<typeof newExhibitorSchema>>({
        resolver: zodResolver(newExhibitorSchema),
        defaultValues: {
            name: "",
            faciaName: "",
            productCategory: "",
            idProof: "",
            contact: "",
            phone: "",
            secondaryPhone: "",
            address: "",
            email: "",
            advancePaid: 0,
            isPhysicalFormSubmitted: false,
        }
    });

    useEffect(() => {
        if (open) {
            getExhibitors().then(setExhibitors);
        }
    }, [open]);

    async function onBookingSubmit(values: z.infer<typeof formSchema>) {
        try {
            await createBooking({
                eventId,
                spaceId: space.id,
                exhibitorId: values.exhibitorId,
                totalAmount: space.category.price
            });
            setOpen(false);
        } catch (error) {
            console.error("Failed to create booking", error);
        }
    }

    async function onNewExhibitorSubmit(values: z.infer<typeof newExhibitorSchema>) {
        try {
            const newExhibitor = await createExhibitor(values);
            setExhibitors([...exhibitors, newExhibitor]);
            form.setValue("exhibitorId", newExhibitor.id);
            setShowNewExhibitor(false);
            setExhibitorOpen(false);
            newExhibitorForm.reset();
        } catch (error) {
            console.error("Failed to create exhibitor", error);
        }
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <div className={cn(`
            border-2 rounded-lg hover:border-primary/50 transition-colors cursor-pointer bg-card text-card-foreground shadow-sm
            ${space.status === 'Booked' ? 'bg-muted/50 border-muted' : ''}
        `, space.status !== 'Available' && 'cursor-not-allowed opacity-70 hover:border-muted')}
                >
                    <div className="p-4 pb-2">
                        <div className="flex justify-between items-start">
                            <span className="font-bold text-lg">{space.label}</span>
                            <div className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 ${space.status === 'Available' ? 'text-foreground' : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'}`}>
                                {space.status}
                            </div>
                        </div>
                    </div>
                    <div className="p-4 pt-0">
                        <div className="text-sm text-muted-foreground mt-2">
                            <p className="font-medium text-foreground">{space.category.name}</p>
                            <p>{space.category.dimensions} • ₹{space.category.price}</p>
                        </div>
                        {space.bookings.length > 0 && space.bookings[0].exhibitor && (
                            <div className="mt-3 pt-3 border-t text-xs">
                                <span className="text-muted-foreground">Booked by:</span>
                                <p className="font-medium truncate">{space.bookings[0].exhibitor.name}</p>
                            </div>
                        )}
                    </div>
                </div>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Book Space {space.label}</DialogTitle>
                    <DialogDescription>
                        Assign an exhibitor to this {space.category.name}.
                        <br />
                        <strong>Price: ₹{space.category.price}</strong>
                    </DialogDescription>
                </DialogHeader>

                {!showNewExhibitor ? (
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onBookingSubmit)} className="space-y-4">
                            <FormField
                                control={form.control}
                                name="exhibitorId"
                                render={({ field }) => (
                                    <FormItem className="flex flex-col">
                                        <FormLabel>Exhibitor</FormLabel>
                                        <Popover open={exhibitorOpen} onOpenChange={setExhibitorOpen}>
                                            <PopoverTrigger asChild>
                                                <FormControl>
                                                    <Button
                                                        variant="outline"
                                                        role="combobox"
                                                        className={cn(
                                                            "w-full justify-between",
                                                            !field.value && "text-muted-foreground"
                                                        )}
                                                    >
                                                        {field.value
                                                            ? exhibitors.find(
                                                                (exhibitor) => exhibitor.id === field.value
                                                            )?.name
                                                            : "Select exhibitor"}
                                                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                                    </Button>
                                                </FormControl>
                                            </PopoverTrigger>
                                            <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                                                <Command>
                                                    <CommandInput placeholder="Search exhibitor..." />
                                                    <CommandList>
                                                        <CommandEmpty>
                                                            <Button
                                                                variant="ghost"
                                                                className="w-full justify-start text-sm"
                                                                onClick={() => setShowNewExhibitor(true)}
                                                            >
                                                                <UserPlus className="mr-2 h-4 w-4" />
                                                                Create new exhibitor
                                                            </Button>
                                                        </CommandEmpty>
                                                        <CommandGroup>
                                                            {exhibitors.map((exhibitor) => (
                                                                <CommandItem
                                                                    value={exhibitor.name}
                                                                    key={exhibitor.id}
                                                                    onSelect={() => {
                                                                        form.setValue("exhibitorId", exhibitor.id);
                                                                        setExhibitorOpen(false);
                                                                    }}
                                                                >
                                                                    <Check
                                                                        className={cn(
                                                                            "mr-2 h-4 w-4",
                                                                            exhibitor.id === field.value
                                                                                ? "opacity-100"
                                                                                : "opacity-0"
                                                                        )}
                                                                    />
                                                                    {exhibitor.name}
                                                                </CommandItem>
                                                            ))}
                                                        </CommandGroup>
                                                    </CommandList>
                                                </Command>
                                            </PopoverContent>
                                        </Popover>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <Button
                                type="button"
                                variant="link"
                                className="px-0 h-auto"
                                onClick={() => setShowNewExhibitor(true)}
                            >
                                + Create New Exhibitor
                            </Button>

                            <DialogFooter>
                                <Button type="submit">Confirm Booking</Button>
                            </DialogFooter>
                        </form>
                    </Form>
                ) : (
                    <Form {...newExhibitorForm}>
                        <form onSubmit={newExhibitorForm.handleSubmit(onNewExhibitorSubmit)} className="space-y-3 h-[60vh] overflow-y-auto px-1">
                            <FormField
                                control={newExhibitorForm.control}
                                name="name"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Company Name</FormLabel>
                                        <FormControl><Input {...field} /></FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <div className="grid grid-cols-2 gap-2">
                                <FormField
                                    control={newExhibitorForm.control}
                                    name="contact"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Contact Person</FormLabel>
                                            <FormControl><Input {...field} /></FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={newExhibitorForm.control}
                                    name="phone"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Phone</FormLabel>
                                            <FormControl><Input {...field} /></FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>
                            <FormField
                                control={newExhibitorForm.control}
                                name="email"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Email</FormLabel>
                                        <FormControl><Input {...field} /></FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <div className="grid grid-cols-2 gap-2">
                                <FormField
                                    control={newExhibitorForm.control}
                                    name="faciaName"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Facia Name</FormLabel>
                                            <FormControl><Input {...field} /></FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={newExhibitorForm.control}
                                    name="productCategory"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Product Category</FormLabel>
                                            <FormControl><Input {...field} /></FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                                <FormField
                                    control={newExhibitorForm.control}
                                    name="advancePaid"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Advance Paid</FormLabel>
                                            <FormControl>
                                                <Input
                                                    type="number"
                                                    value={field.value}
                                                    onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                                                />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={newExhibitorForm.control}
                                    name="isPhysicalFormSubmitted"
                                    render={({ field }) => (
                                        <FormItem className="flex flex-row items-start space-x-2 space-y-0 rounded-md border p-3 mt-auto">
                                            <FormControl>
                                                <input
                                                    type="checkbox"
                                                    checked={field.value}
                                                    onChange={field.onChange}
                                                    className="h-4 w-4 mt-1"
                                                />
                                            </FormControl>
                                            <div className="leading-none">
                                                <FormLabel>
                                                    Form Submitted
                                                </FormLabel>
                                            </div>
                                        </FormItem>
                                    )}
                                />
                            </div>

                            <div className="flex gap-2 justify-end mt-4 pt-2 border-t">
                                <Button type="button" variant="ghost" onClick={() => setShowNewExhibitor(false)}>Cancel</Button>
                                <Button type="submit">Save & Select</Button>
                            </div>
                        </form>
                    </Form>
                )}
            </DialogContent>
        </Dialog>
    );
}

