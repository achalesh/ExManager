'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
    SheetTrigger,
} from "@/components/ui/sheet";
import { Badge } from '@/components/ui/badge';
import { getMaterialItems, deleteMaterialItem } from '@/app/inventory-actions';
import { BulkAddMaterialDialog } from '../dialogs/BulkAddMaterialDialog';
import { QRCodeSheet } from '../printing/QRCodeSheet';
import { Boxes, RotateCw, Trash2 } from 'lucide-react';

interface Material {
    id: number;
    name: string;
    unit: string;
}

export function MaterialInventoryList({ material }: { material: Material }) {
    const [items, setItems] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [open, setOpen] = useState(false);

    const fetchItems = async () => {
        setLoading(true);
        const data = await getMaterialItems(material.id);
        setItems(data);
        setLoading(false);
    };

    return (
        <Sheet open={open} onOpenChange={(val: boolean) => {
            setOpen(val);
            if (val) fetchItems();
        }}>
            <SheetTrigger asChild>
                <Button variant="ghost" size="sm" className="text-blue-600 hover:text-blue-800">
                    <Boxes className="h-4 w-4 mr-1" />
                    Inventory
                </Button>
            </SheetTrigger>
            <SheetContent className="w-[400px] sm-[540px] overflow-y-auto">
                <SheetHeader className="mb-6">
                    <SheetTitle>Inventory: {material.name}</SheetTitle>
                    <SheetDescription>
                        Manage individual items and generate QR codes.
                    </SheetDescription>
                </SheetHeader>

                <div className="space-y-6">
                    <div className="bg-gray-50 p-4 rounded-lg flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-gray-500">Total Items</p>
                            <p className="text-2xl font-bold">{items.length}</p>
                        </div>
                        <div className="flex flex-col gap-2">
                            <BulkAddMaterialDialog
                                materialId={material.id}
                                materialName={material.name}
                                onSuccess={fetchItems}
                            />
                            <QRCodeSheet materialName={material.name} items={items} />
                        </div>
                    </div>

                    <div className="flex items-center justify-between">
                        <h3 className="font-semibold text-gray-900">Item List</h3>
                        <Button variant="ghost" size="sm" onClick={fetchItems} disabled={loading}>
                            <RotateCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                        </Button>
                    </div>

                    <div className="border rounded-md divide-y">
                        {items.length === 0 ? (
                            <div className="p-4 text-center text-gray-500 text-sm">
                                No items found. Add some using "Bulk Add".
                            </div>
                        ) : (
                            items.map((item) => (
                                <div key={item.id} className="p-3 flex items-center justify-between hover:bg-gray-50">
                                    <div className="flex items-center gap-3">
                                        <div className="h-8 w-8 bg-gray-100 rounded flex items-center justify-center text-xs font-mono">
                                            #{item.id}
                                        </div>
                                        <div>
                                            <div className="font-mono text-sm font-medium">{item.uniqueCode}</div>
                                            <div className="text-xs text-gray-500">
                                                Added {new Date(item.createdAt).toLocaleDateString()}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center">
                                        <Badge variant="outline" className={
                                            item.status === 'Available' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-gray-100'
                                        }>
                                            {item.status}
                                        </Badge>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="text-red-500 hover:text-red-700 hover:bg-red-50 ml-2"
                                            onClick={async () => {
                                                if (!confirm(`Delete item ${item.uniqueCode}?`)) return;
                                                await deleteMaterialItem(item.id);
                                                fetchItems();
                                            }}
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </SheetContent>
        </Sheet>
    );
}
