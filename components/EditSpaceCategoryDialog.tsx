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
import { updateSpaceCategory } from '@/app/space-actions';
import { Edit, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';

const formSchema = z.object({
    name: z.string().min(2, "Name must be at least 2 characters"),
    price: z.string().refine((val) => !isNaN(Number(val)) && Number(val) >= 0, {
        message: "Price must be a valid positive number",
    }),
    shape: z.string().min(1, "Shape is required"),
    dimensions: z.string().min(1, "Dimensions are required"),
});

interface EditSpaceCategoryDialogProps {
    category: {
        id: number;
        name: string;
        price: number;
        shape: string;
        dimensions: string;
    };
}

export function EditSpaceCategoryDialog({ category }: EditSpaceCategoryDialogProps) {
    const [open, setOpen] = useState(false);
    const router = useRouter();

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            name: category.name,
            price: category.price.toString(),
            shape: category.shape,
            dimensions: category.dimensions,
        },
    });

    const isLoading = form.formState.isSubmitting;

    async function onSubmit(values: z.infer<typeof formSchema>) {
        try {
            const result = await updateSpaceCategory({
                id: category.id,
                name: values.name,
                price: parseFloat(values.price),
                shape: values.shape,
                dimensions: values.dimensions,
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
                    <DialogTitle>Edit Space Category</DialogTitle>
                    <DialogDescription>
                        Update details for {category.name}
                    </DialogDescription>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <FormField
                            control={form.control}
                            name="name"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Category Name</FormLabel>
                                    <FormControl>
                                        <Input placeholder="e.g. Standard Stall" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <div className="grid grid-cols-2 gap-4">
                            <FormField
                                control={form.control}
                                name="shape"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Shape</FormLabel>
                                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                                            <FormControl>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Select shape" />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                <SelectItem value="Square">Square</SelectItem>
                                                <SelectItem value="Rectangle">Rectangle</SelectItem>
                                                <SelectItem value="L-Shape">L-Shape</SelectItem>
                                                <SelectItem value="Irregular">Irregular</SelectItem>
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="dimensions"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Dimensions</FormLabel>
                                        <FormControl>
                                            <Input placeholder="e.g. 3x3m" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>
                        <FormField
                            control={form.control}
                            name="price"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Price (₹)</FormLabel>
                                    <FormControl>
                                        <Input type="number" step="0.01" {...field} />
                                    </FormControl>
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
