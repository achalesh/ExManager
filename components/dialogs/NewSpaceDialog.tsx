'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { LayoutGrid, Plus } from 'lucide-react';

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
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from '@/components/ui/form';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { Input } from '@/components/ui/input';
import { createSpace } from '@/app/actions';
import { SpaceCategory } from '@prisma/client';

const formSchema = z.object({
    label: z.string().min(1, "Label is required"),
    categoryId: z.string().min(1, "Category is required"),
});

interface NewSpaceDialogProps {
    eventId: number;
    categories: SpaceCategory[];
}

export function NewSpaceDialog({ eventId, categories }: NewSpaceDialogProps) {
    const [open, setOpen] = useState(false);
    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            label: "",
            categoryId: "",
        },
    });

    async function onSubmit(values: z.infer<typeof formSchema>) {
        try {
            await createSpace({
                label: values.label,
                eventId: eventId,
                categoryId: Number(values.categoryId)
            });
            setOpen(false);
            form.reset();
        } catch (error) {
            console.error("Failed to create space", error);
        }
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button>
                    <Plus className="mr-2 h-4 w-4" /> Add Space
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Add Space to Event</DialogTitle>
                    <DialogDescription>
                        Create a new allocatable space.
                    </DialogDescription>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <FormField
                            control={form.control}
                            name="label"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Space Label</FormLabel>
                                    <FormControl>
                                        <Input placeholder="e.g. A-101" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="categoryId"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Category</FormLabel>
                                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                                        <FormControl>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Select a category" />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            {categories.map((cat) => (
                                                <SelectItem key={cat.id} value={cat.id.toString()}>
                                                    {cat.name} ({cat.dimensions}) - ${cat.price}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <div className="bg-muted p-3 rounded-md text-xs text-muted-foreground flex items-center gap-2">
                            <LayoutGrid className="h-4 w-4" />
                            <span>Don't see the right category? Create one in the settings menu.</span>
                        </div>

                        <DialogFooter>
                            <Button type="submit">Add Space</Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}
