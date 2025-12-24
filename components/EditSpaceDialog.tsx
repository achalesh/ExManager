'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
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
import { Input } from '@/components/ui/input';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { updateSpace } from '@/app/space-actions';
import { Edit, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';

const formSchema = z.object({
    label: z.string().min(1, "Label is required"),
    categoryId: z.string().min(1, "Category is required"),
    status: z.enum(['Available', 'Booked', 'Reserved']),
});

interface EditSpaceDialogProps {
    space: {
        id: number;
        label: string;
        categoryId: number;
        status: string;
    };
    categories: {
        id: number;
        name: string;
    }[];
}

export function EditSpaceDialog({ space, categories }: EditSpaceDialogProps) {
    const [open, setOpen] = useState(false);
    const router = useRouter();

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            label: space.label,
            categoryId: space.categoryId.toString(),
            status: space.status as 'Available' | 'Booked' | 'Reserved',
        },
    });

    const isLoading = form.formState.isSubmitting;

    async function onSubmit(values: z.infer<typeof formSchema>) {
        try {
            const result = await updateSpace({
                id: space.id,
                label: values.label,
                categoryId: parseInt(values.categoryId, 10),
                status: values.status,
            });

            if (result.success) {
                setOpen(false);
                router.refresh();
            } else {
                form.setError('root', { message: result.error });
            }
        } catch (error) {
            console.error(error);
            form.setError('root', { message: 'Something went wrong' });
        }
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                    <Edit className="h-4 w-4" />
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Edit Space</DialogTitle>
                    <DialogDescription>
                        Update details for space {space.label}
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
                                        <Input placeholder="e.g. A01" {...field} />
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
                                    <Select
                                        onValueChange={field.onChange}
                                        defaultValue={field.value?.toString()}
                                    >
                                        <FormControl>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Select category" />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            {categories.map((cat) => (
                                                <SelectItem key={cat.id} value={cat.id.toString()}>
                                                    {cat.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="status"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Status</FormLabel>
                                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                                        <FormControl>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Select status" />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            <SelectItem value="Available">Available</SelectItem>
                                            <SelectItem value="Booked">Booked</SelectItem>
                                            <SelectItem value="Reserved">Reserved</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        {form.formState.errors.root && (
                            <div className="text-sm text-red-500">
                                {form.formState.errors.root.message}
                            </div>
                        )}

                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={isLoading}>
                                Cancel
                            </Button>
                            <Button type="submit" disabled={isLoading}>
                                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Save Changes
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}
