'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Plus, Trash2, Edit } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { deleteTicketType } from '@/app/ticketing-actions';
import { CreateTicketTypeDialog } from '@/components/CreateTicketTypeDialog';
import { UpdateTicketTypeDialog } from '@/components/UpdateTicketTypeDialog';

interface TicketType {
    id: number;
    name: string;
    category: string;
    price: number;
    amusementOwner?: { name: string } | null;
    ownerSharePercentage?: number;
}

export function TicketItemsList({ initialItems, eventId }: { initialItems: TicketType[], eventId: number }) {
    const [items, setItems] = useState(initialItems);
    const router = useRouter();
    const [loading, setLoading] = useState(false);

    const handleDelete = async (id: number) => {
        if (!confirm('Are you sure you want to delete this ticket item?')) return;
        setLoading(true);
        const res = await deleteTicketType(id);
        if (res.success) {
            router.refresh();
        } else {
            alert(res.error);
        }
        setLoading(false);
    };

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center">
                <h2 className="text-xl font-semibold">Ticket Items</h2>
                <CreateTicketTypeDialog eventId={eventId} />
            </div>

            <div className="border rounded-md">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Name</TableHead>
                            <TableHead>Category</TableHead>
                            <TableHead>Price</TableHead>
                            <TableHead>Owner (Share)</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {initialItems.map((item) => (
                            <TableRow key={item.id}>
                                <TableCell className="font-medium">{item.name}</TableCell>
                                <TableCell>
                                    <Badge variant={item.category === 'Entrance' ? 'default' : 'secondary'}>
                                        {item.category}
                                    </Badge>
                                </TableCell>
                                <TableCell>₹{item.price}</TableCell>
                                <TableCell>
                                    {item.amusementOwner ? (
                                        <span className="text-sm text-gray-600">
                                            {item.amusementOwner.name} ({item.ownerSharePercentage}%)
                                        </span>
                                    ) : (
                                        <span className="text-gray-400">-</span>
                                    )}
                                </TableCell>
                                <TableCell className="text-right">
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => handleDelete(item.id)}
                                        disabled={loading}
                                        className="text-red-500 hover:text-red-700 hover:bg-red-50"
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                    <UpdateTicketTypeDialog ticketType={item as any} />
                                </TableCell>
                            </TableRow>
                        ))}
                        {initialItems.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={5} className="text-center py-8 text-gray-500">
                                    No ticket items defined. Click "Add Ticket Type" to create one.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
}
