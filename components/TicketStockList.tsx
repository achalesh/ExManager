'use client';

import { useState } from 'react';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { AddInventoryDialog } from '@/components/AddInventoryDialog';
import { DeleteInventoryButton } from '@/components/DeleteInventoryButton';

interface TicketInventory {
    id: number;
    seriesLabel: string;
    startNumber: number;
    endNumber: number;
    currentNumber: number;
    category: string;
    price: number;
    status: string;
}

export function TicketStockList({ initialInventory, eventId }: { initialInventory: TicketInventory[], eventId: number }) {
    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center">
                <h2 className="text-xl font-semibold">Stock Registry</h2>
                <AddInventoryDialog eventId={eventId} />
            </div>

            <div className="border rounded-md">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Series</TableHead>
                            <TableHead>Category</TableHead>
                            <TableHead>Price</TableHead>
                            <TableHead>Range</TableHead>
                            <TableHead>Available Qty</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {initialInventory.map((item) => {
                            const available = item.endNumber - item.currentNumber + 1;
                            return (
                                <TableRow key={item.id}>
                                    <TableCell className="font-medium">{item.seriesLabel}</TableCell>
                                    <TableCell>
                                        <Badge variant="outline">
                                            {item.category}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>₹{item.price}</TableCell>
                                    <TableCell className="font-mono text-sm">
                                        {item.startNumber} - {item.endNumber}
                                    </TableCell>
                                    <TableCell>
                                        <span className={available > 0 ? "text-green-600 font-bold" : "text-red-500"}>
                                            {available}
                                        </span>
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant={item.status === 'Available' ? 'outline' : 'secondary'}>
                                            {item.status}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <DeleteInventoryButton id={item.id} label={item.seriesLabel} />
                                    </TableCell>
                                </TableRow>
                            );
                        })}
                        {initialInventory.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                                    No stock recorded. Click "Add Stock Bundle" to register new tickets.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
}
