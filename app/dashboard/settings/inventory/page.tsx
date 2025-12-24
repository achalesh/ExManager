import { getSession } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { getInventory } from '@/app/inventory-actions';
import { AddInventoryDialog } from '@/components/AddInventoryDialog';
import { EditInventoryDialog } from '@/components/EditInventoryDialog';
import { DeleteInventoryButton } from '@/components/DeleteInventoryButton';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, Clock } from 'lucide-react';

export default async function InventoryPage() {
    const session = await getSession();

    if (!session || !['Admin', 'Manager'].includes(session.roleName)) {
        redirect('/dashboard');
    }

    if (!session.activeEventId) {
        return <div className="p-8 text-center text-gray-500">Please select an event first.</div>;
    }

    const inventory = await getInventory(session.activeEventId);

    return (
        <div className="max-w-5xl mx-auto">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 mb-2">Stock Inventory</h1>
                    <p className="text-gray-600">Registry of all physical ticket bundles for {session.activeEventName}</p>
                </div>
                <AddInventoryDialog eventId={session.activeEventId} />
            </div>

            {/* Summary Sections */}
            {/* Summary Sections */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
                {/* Category Wise Summary */}
                <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                    <div className="mb-4">
                        <h3 className="text-lg font-bold text-gray-900">Category Wise Summary</h3>
                    </div>
                    <div className="space-y-4">
                        {(() => {
                            const catMap = new Map<string, { available: number, total: number, allocated: number }>();
                            inventory.forEach(item => {
                                const cat = (item as any).category || 'General';
                                const remaining = Math.max(0, item.endNumber - item.currentNumber + 1);
                                const total = item.endNumber - item.startNumber + 1;
                                const allocated = total - remaining;

                                const current = catMap.get(cat) || { available: 0, total: 0, allocated: 0 };
                                catMap.set(cat, {
                                    available: current.available + remaining,
                                    total: current.total + total,
                                    allocated: current.allocated + allocated
                                });
                            });

                            if (catMap.size === 0) return <div className="text-gray-500 italic">No data</div>;

                            return (
                                <div className="space-y-3">
                                    <div className="grid grid-cols-4 text-xs font-semibold text-gray-500 uppercase tracking-wider pb-2 border-b border-gray-100">
                                        <div className="col-span-1">Category</div>
                                        <div className="text-right text-blue-600">Total</div>
                                        <div className="text-right text-orange-600">Alloc</div>
                                        <div className="text-right text-green-600">Avail</div>
                                    </div>
                                    {Array.from(catMap.entries()).map(([cat, data]) => (
                                        <div key={cat} className="grid grid-cols-4 items-center text-sm">
                                            <div className="col-span-1 font-medium text-gray-900 truncate pr-2">{cat}</div>
                                            <div className="text-right font-medium text-gray-600">{data.total.toLocaleString()}</div>
                                            <div className="text-right font-medium text-gray-600">{data.allocated.toLocaleString()}</div>
                                            <div className="text-right font-bold text-green-600">{data.available.toLocaleString()}</div>
                                        </div>
                                    ))}
                                </div>
                            );
                        })()}
                    </div>
                </div>

                {/* Category & Rate Wise Summary */}
                <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                    <div className="mb-4">
                        <h3 className="text-lg font-bold text-gray-900">Category & Rate Summary</h3>
                    </div>
                    <div className="space-y-4">
                        {(() => {
                            const comboMap = new Map<string, { category: string, price: number, available: number, total: number, allocated: number }>();
                            inventory.forEach(item => {
                                const cat = (item as any).category || 'General';
                                const price = (item as any).price || 0;
                                const key = `${cat}-${price}`;

                                const remaining = Math.max(0, item.endNumber - item.currentNumber + 1);
                                const total = item.endNumber - item.startNumber + 1;
                                const allocated = total - remaining;

                                const current = comboMap.get(key) || { category: cat, price, available: 0, total: 0, allocated: 0 };
                                comboMap.set(key, {
                                    category: cat,
                                    price,
                                    available: current.available + remaining,
                                    total: current.total + total,
                                    allocated: current.allocated + allocated
                                });
                            });

                            if (comboMap.size === 0) return <div className="text-gray-500 italic">No data</div>;

                            return (
                                <div className="space-y-3">
                                    <div className="grid grid-cols-5 text-xs font-semibold text-gray-500 uppercase tracking-wider pb-2 border-b border-gray-100">
                                        <div className="col-span-2">Category</div>
                                        <div className="col-span-1 text-right">Rate</div>
                                        {/* <div className="text-right text-blue-600">Total</div> */}
                                        <div className="text-right text-orange-600">Alloc</div>
                                        <div className="text-right text-green-600">Avail</div>
                                    </div>
                                    {Array.from(comboMap.values())
                                        .sort((a, b) => a.category.localeCompare(b.category) || a.price - b.price)
                                        .map((data) => (
                                            <div key={`${data.category}-${data.price}`} className="grid grid-cols-5 items-center text-sm">
                                                <div className="col-span-2 font-medium text-gray-900 truncate pr-2">{data.category}</div>
                                                <div className="col-span-1 text-right font-medium text-gray-600">₹{data.price}</div>
                                                {/* <div className="text-right font-medium text-gray-600">{data.total.toLocaleString()}</div> */}
                                                <div className="text-right font-medium text-gray-600">{data.allocated.toLocaleString()}</div>
                                                <div className="text-right font-bold text-green-600">{data.available.toLocaleString()}</div>
                                            </div>
                                        ))}
                                </div>
                            );
                        })()}
                    </div>
                </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm overflow-hidden border border-gray-200">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Series Label</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Category</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Range</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Rate</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Remaining</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total Count</th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {inventory.map((item) => {
                                const isExhausted = item.status === 'Exhausted' || item.currentNumber > item.endNumber;
                                const remaining = Math.max(0, item.endNumber - item.currentNumber + 1);
                                const total = item.endNumber - item.startNumber + 1;

                                return (
                                    <tr key={item.id} className="hover:bg-gray-50">
                                        <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-900">
                                            {item.seriesLabel}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                                            {(item as any).category || 'General'}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 font-mono">
                                            {item.startNumber} - {item.endNumber}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            {isExhausted ? (
                                                <Badge variant="secondary" className="bg-gray-100 text-gray-600">
                                                    Exhausted
                                                </Badge>
                                            ) : (
                                                <Badge className="bg-green-100 text-green-700 hover:bg-green-200 border-green-200">
                                                    Available
                                                </Badge>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-medium">
                                            Rs. {(item as any).price || 0}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                                            {remaining > 0 ? (
                                                <div className="flex items-center text-green-600 font-medium">
                                                    <CheckCircle2 className="w-4 h-4 mr-1.5" />
                                                    {remaining}
                                                </div>
                                            ) : (
                                                <span className="text-gray-400">0</span>
                                            )}
                                            {remaining > 0 && remaining < total && (
                                                <div className="text-xs text-gray-400 mt-0.5">
                                                    Next: {item.currentNumber}
                                                </div>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            {total}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                                            <div className="flex justify-end gap-1">
                                                <EditInventoryDialog item={item} />
                                                <DeleteInventoryButton id={item.id} label={item.seriesLabel} />
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
                {inventory.length === 0 && (
                    <div className="p-8 text-center text-gray-500">
                        No stock bundles added yet. Click "Add Stock Bundle" to begin.
                    </div>
                )}
            </div>
        </div>
    );
}
