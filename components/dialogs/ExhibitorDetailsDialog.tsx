'use client';

import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
// Remove IndianRupee generic import if not used directly or use standard text
// Or importing Lucide icons:
import { IndianRupee, MapPin, Package, Zap, Home, CreditCard, User, Phone, Mail } from 'lucide-react';

interface ExhibitorDetailsDialogProps {
    isOpen: boolean;
    onClose: () => void;
    data: any; // Using any for simplicity with the complex return type, or define interface
}

export function ExhibitorDetailsDialog({ isOpen, onClose, data }: ExhibitorDetailsDialogProps) {
    if (!data) return null;

    const { exhibitor, bookings, materialAllocations, electricalAllocations, shedAllocations, payments, summary } = data;

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col p-0 gap-0">
                <div className="p-6 border-b">
                    <DialogHeader>
                        <DialogTitle className="text-2xl font-bold flex items-center justify-between">
                            <span>{exhibitor.name}</span>
                            <Badge variant={summary.balance > 0 ? "destructive" : "secondary"} className="text-base">
                                Due: ₹{summary.balance.toFixed(2)}
                            </Badge>
                        </DialogTitle>
                        <DialogDescription className="text-base mt-2 space-y-1" asChild>
                            <div>
                                {exhibitor.faciaName && <div className="text-blue-600 font-medium">Facia: {exhibitor.faciaName}</div>}
                                <div className="flex flex-wrap gap-4 text-sm text-gray-500 mt-2">
                                    <span className="flex items-center gap-1"><User className="h-4 w-4" /> {exhibitor.contact}</span>
                                    <span className="flex items-center gap-1"><Phone className="h-4 w-4" /> {exhibitor.phone}</span>
                                    {exhibitor.secondaryPhone && <span className="flex items-center gap-1"><Phone className="h-4 w-4" /> {exhibitor.secondaryPhone}</span>}
                                    <span className="flex items-center gap-1"><Mail className="h-4 w-4" /> {exhibitor.email}</span>
                                    {exhibitor.address && <div className="w-full flex items-start gap-1 mt-1"><MapPin className="h-4 w-4 mt-0.5" /> {exhibitor.address}</div>}
                                </div>
                            </div>
                        </DialogDescription>
                    </DialogHeader>
                </div>

                <ScrollArea className="flex-1 p-6">
                    <Tabs defaultValue="overview" className="w-full">
                        <TabsList className="grid w-full grid-cols-5 mb-6">
                            <TabsTrigger value="overview">Overview</TabsTrigger>
                            <TabsTrigger value="materials">Materials ({materialAllocations.length})</TabsTrigger>
                            <TabsTrigger value="electrical">Electrical ({electricalAllocations.length})</TabsTrigger>
                            <TabsTrigger value="shed">Shed ({shedAllocations.length})</TabsTrigger>
                            <TabsTrigger value="payments">Payments ({payments.length})</TabsTrigger>
                        </TabsList>

                        <TabsContent value="overview" className="space-y-6">
                            {/* Financial Snapshot */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="bg-gray-50 p-4 rounded-lg border">
                                    <p className="text-sm text-gray-500">Total Bill Amount</p>
                                    <p className="text-2xl font-bold text-gray-900">₹{summary.grandTotal.toFixed(2)}</p>
                                </div>
                                <div className="bg-green-50 p-4 rounded-lg border border-green-100">
                                    <p className="text-sm text-green-600">Total Paid</p>
                                    <p className="text-2xl font-bold text-green-700">₹{summary.totalPaid.toFixed(2)}</p>
                                </div>
                                <div className={`p-4 rounded-lg border ${summary.balance > 0 ? 'bg-red-50 border-red-100' : 'bg-gray-50 border-gray-200'}`}>
                                    <p className={`text-sm ${summary.balance > 0 ? 'text-red-600' : 'text-gray-500'}`}>Balance Due</p>
                                    <p className={`text-2xl font-bold ${summary.balance > 0 ? 'text-red-700' : 'text-gray-900'}`}>
                                        ₹{summary.balance.toFixed(2)}
                                    </p>
                                </div>
                            </div>

                            {/* Bookings */}
                            <div className="bg-white border rounded-lg overflow-hidden">
                                <div className="bg-gray-50 px-4 py-3 border-b flex items-center gap-2">
                                    <MapPin className="h-4 w-4 text-gray-500" />
                                    <h3 className="font-semibold text-gray-700">Space Bookings</h3>
                                </div>
                                <div className="divide-y">
                                    {bookings.map((booking: any) => (
                                        <div key={booking.id} className="p-4 flex justify-between items-center">
                                            <div>
                                                <p className="font-bold text-lg">{booking.space.label}</p>
                                                <p className="text-sm text-gray-500">{booking.space.category.name} - {booking.space.category.dimensions}</p>
                                            </div>
                                            <p className="font-semibold">₹{booking.totalAmount.toFixed(2)}</p>
                                        </div>
                                    ))}
                                </div>
                                <div className="bg-gray-50 px-4 py-2 border-t text-right font-medium text-sm text-gray-600">
                                    Subtotal: ₹{summary.spaceTotal.toFixed(2)}
                                </div>
                            </div>
                        </TabsContent>

                        <TabsContent value="materials">
                            <div className="bg-white border rounded-lg overflow-hidden">
                                <div className="bg-gray-50 px-4 py-3 border-b flex items-center gap-2">
                                    <Package className="h-4 w-4 text-blue-500" />
                                    <h3 className="font-semibold text-gray-700">Material Allocations</h3>
                                </div>
                                {materialAllocations.length === 0 ? (
                                    <div className="p-8 text-center text-gray-500">No materials allocated</div>
                                ) : (
                                    <table className="w-full text-sm">
                                        <thead className="bg-gray-50 text-gray-600">
                                            <tr>
                                                <th className="px-4 py-2 text-left">Item</th>
                                                <th className="px-4 py-2 text-center">Qty</th>
                                                <th className="px-4 py-2 text-left">Details</th>
                                                <th className="px-4 py-2 text-right">Cost</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y">
                                            {materialAllocations.map((alloc: any) => (
                                                <tr key={alloc.id}>
                                                    <td className="px-4 py-3 font-medium">
                                                        {alloc.material.name}
                                                        {alloc.isFOC && <Badge variant="outline" className="ml-2 text-xs border-green-200 text-green-700 bg-green-50">FOC</Badge>}
                                                    </td>
                                                    <td className="px-4 py-3 text-center">{alloc.quantity}</td>
                                                    <td className="px-4 py-3 text-gray-500 text-xs">
                                                        {alloc.items?.map((i: any) => i.uniqueCode).join(', ') || '-'}
                                                    </td>
                                                    <td className="px-4 py-3 text-right font-medium">₹{alloc.totalPrice.toFixed(2)}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                )}
                                <div className="bg-gray-50 px-4 py-2 border-t text-right font-medium text-sm text-gray-600">
                                    Subtotal: ₹{summary.materialTotal.toFixed(2)}
                                </div>
                            </div>
                        </TabsContent>

                        <TabsContent value="electrical">
                            <div className="bg-white border rounded-lg overflow-hidden">
                                <div className="bg-gray-50 px-4 py-3 border-b flex items-center gap-2">
                                    <Zap className="h-4 w-4 text-yellow-500" />
                                    <h3 className="font-semibold text-gray-700">Electrical Allocations</h3>
                                </div>
                                {electricalAllocations.length === 0 ? (
                                    <div className="p-8 text-center text-gray-500">No electrical items allocated</div>
                                ) : (
                                    <table className="w-full text-sm">
                                        <thead className="bg-gray-50 text-gray-600">
                                            <tr>
                                                <th className="px-4 py-2 text-left">Item</th>
                                                <th className="px-4 py-2 text-center">Qty</th>
                                                <th className="px-4 py-2 text-right">Wattage</th>
                                                <th className="px-4 py-2 text-right">Cost</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y">
                                            {electricalAllocations.map((alloc: any) => (
                                                <tr key={alloc.id}>
                                                    <td className="px-4 py-3 font-medium">{alloc.electricalItem.name}</td>
                                                    <td className="px-4 py-3 text-center">{alloc.quantity}</td>
                                                    <td className="px-4 py-3 text-right text-gray-500">{alloc.totalWattage}W</td>
                                                    <td className="px-4 py-3 text-right font-medium">₹{alloc.totalPrice.toFixed(2)}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                )}
                                <div className="bg-gray-50 px-4 py-2 border-t text-right font-medium text-sm text-gray-600">
                                    Subtotal: ₹{summary.electricalTotal.toFixed(2)}
                                </div>
                            </div>
                        </TabsContent>

                        <TabsContent value="shed">
                            <div className="bg-white border rounded-lg overflow-hidden">
                                <div className="bg-gray-50 px-4 py-3 border-b flex items-center gap-2">
                                    <Home className="h-4 w-4 text-green-500" />
                                    <h3 className="font-semibold text-gray-700">Shed Allocations</h3>
                                </div>
                                {shedAllocations.length === 0 ? (
                                    <div className="p-8 text-center text-gray-500">No sheds allocated</div>
                                ) : (
                                    <table className="w-full text-sm">
                                        <thead className="bg-gray-50 text-gray-600">
                                            <tr>
                                                <th className="px-4 py-2 text-left">Shed Type</th>
                                                <th className="px-4 py-2 text-left">Dimensions</th>
                                                <th className="px-4 py-2 text-right">Cost</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y">
                                            {shedAllocations.map((alloc: any) => (
                                                <tr key={alloc.id}>
                                                    <td className="px-4 py-3 font-medium">{alloc.shed.name}</td>
                                                    <td className="px-4 py-3 text-gray-500">{alloc.shed.dimensions}</td>
                                                    <td className="px-4 py-3 text-right font-medium">₹{(alloc.price || 0).toFixed(2)}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                )}
                                <div className="bg-gray-50 px-4 py-2 border-t text-right font-medium text-sm text-gray-600">
                                    Subtotal: ₹{summary.shedTotal.toFixed(2)}
                                </div>
                            </div>
                        </TabsContent>

                        <TabsContent value="payments">
                            <div className="bg-white border rounded-lg overflow-hidden">
                                <div className="bg-gray-50 px-4 py-3 border-b flex items-center gap-2">
                                    <CreditCard className="h-4 w-4 text-purple-500" />
                                    <h3 className="font-semibold text-gray-700">Payment History</h3>
                                </div>
                                {payments.length === 0 ? (
                                    <div className="p-8 text-center text-gray-500">No payments recorded</div>
                                ) : (
                                    <table className="w-full text-sm">
                                        <thead className="bg-gray-50 text-gray-600">
                                            <tr>
                                                <th className="px-4 py-2 text-left">Date</th>
                                                <th className="px-4 py-2 text-left">Mode</th>
                                                <th className="px-4 py-2 text-left">Reference</th>
                                                <th className="px-4 py-2 text-right">Amount</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y">
                                            {payments.map((payment: any) => (
                                                <tr key={payment.id}>
                                                    <td className="px-4 py-3 text-gray-600">{new Date(payment.createdAt).toLocaleDateString()}</td>
                                                    <td className="px-4 py-3 font-medium">{payment.mode}</td>
                                                    <td className="px-4 py-3 text-gray-500 font-mono text-xs">{payment.referenceNo || '-'}</td>
                                                    <td className="px-4 py-3 text-right font-medium text-green-700">₹{payment.amount.toFixed(2)}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                )}
                                <div className="bg-gray-50 px-4 py-2 border-t text-right font-medium text-sm text-gray-600">
                                    Total Paid: ₹{summary.totalPaid.toFixed(2)}
                                </div>
                            </div>
                        </TabsContent>
                    </Tabs>
                </ScrollArea>
            </DialogContent>
        </Dialog>
    );
}
