'use client';

import { useState, useMemo } from 'react';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { AddInventoryDialog } from '@/components/AddInventoryDialog';
import { DeleteInventoryButton } from '@/components/DeleteInventoryButton';
import { ArrowUpDown } from 'lucide-react';
import { Button } from '@/components/ui/button';

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

type SortConfig = {
    key: keyof TicketInventory | 'available';
    direction: 'asc' | 'desc';
} | null;

export function TicketStockList({ initialInventory, eventId }: { initialInventory: TicketInventory[], eventId: number }) {
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('All');
    const [sortConfig, setSortConfig] = useState<SortConfig>(null);

    const filteredInventory = useMemo(() => {
        let items = [...initialInventory];

        // 1. Filter
        if (searchTerm) {
            const lowerTerm = searchTerm.toLowerCase();
            items = items.filter(item =>
                item.seriesLabel.toLowerCase().includes(lowerTerm) ||
                item.category.toLowerCase().includes(lowerTerm)
            );
        }

        if (statusFilter !== 'All') {
            items = items.filter(item => item.status === statusFilter);
        }

        // 2. Sort
        if (sortConfig) {
            items.sort((a, b) => {
                let aValue: any = a[sortConfig.key as keyof TicketInventory];
                let bValue: any = b[sortConfig.key as keyof TicketInventory];

                if (sortConfig.key === 'available') {
                    aValue = a.endNumber - a.currentNumber + 1;
                    bValue = b.endNumber - b.currentNumber + 1;
                }

                if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
                if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
                return 0;
            });
        }

        return items;
    }, [initialInventory, searchTerm, statusFilter, sortConfig]);

    const handleSort = (key: keyof TicketInventory | 'available') => {
        setSortConfig(current => {
            if (current?.key === key) {
                return { key, direction: current.direction === 'asc' ? 'desc' : 'asc' };
            }
            return { key, direction: 'asc' };
        });
    };

    return (
        <div className="space-y-4">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <h2 className="text-xl font-semibold">Stock Registry</h2>
                <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto">
                    <Input
                        placeholder="Search series or category..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full sm:w-[200px]"
                    />
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                        <SelectTrigger className="w-full sm:w-[150px]">
                            <SelectValue placeholder="Status" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="All">All Status</SelectItem>
                            <SelectItem value="Available">Available</SelectItem>
                            <SelectItem value="Exhausted">Exhausted</SelectItem>
                            <SelectItem value="Reserved">Reserved</SelectItem>
                        </SelectContent>
                    </Select>
                    <AddInventoryDialog eventId={eventId} />
                </div>
            </div>

            <div className="border rounded-md">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>
                                <Button variant="ghost" onClick={() => handleSort('seriesLabel')} className="h-8 p-0 font-bold hover:bg-transparent">
                                    Series <ArrowUpDown className="ml-2 h-4 w-4" />
                                </Button>
                            </TableHead>
                            <TableHead>Type</TableHead>
                            <TableHead>
                                <Button variant="ghost" onClick={() => handleSort('price')} className="h-8 p-0 font-bold hover:bg-transparent">
                                    Price <ArrowUpDown className="ml-2 h-4 w-4" />
                                </Button>
                            </TableHead>
                            <TableHead>Range</TableHead>
                            <TableHead>
                                <Button variant="ghost" onClick={() => handleSort('available')} className="h-8 p-0 font-bold hover:bg-transparent">
                                    Available <ArrowUpDown className="ml-2 h-4 w-4" />
                                </Button>
                            </TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filteredInventory.map((item) => {
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
                        {filteredInventory.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                                    No matching stock found.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
}
