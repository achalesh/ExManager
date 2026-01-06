import { getSession } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { getInventory } from '@/app/inventory-actions';
import { TicketStockList } from '@/components/TicketStockList';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Package, Ticket, IndianRupee, Layers, Tag } from 'lucide-react';

export default async function Page() {
    const session = await getSession();
    if (!session || !['Admin', 'Manager'].includes(session.roleName)) {
        redirect('/dashboard');
    }

    if (!session.activeEventId) {
        return <div className="p-8 text-center text-gray-500">Please select an event.</div>;
    }

    const inventory = await getInventory(session.activeEventId);

    // Calculate Summaries
    const totalBundles = inventory.length;
    let totalTickets = 0;
    let totalValue = 0;

    // By Category
    const categoryStats: Record<string, { count: number, tickets: number, value: number }> = {};
    // By Variant (Category + Price)
    const variantStats: Record<string, { count: number, tickets: number, value: number }> = {};

    inventory.forEach(item => {
        const count = item.endNumber - item.currentNumber + 1;
        const val = count * item.price;

        if (count > 0) {
            totalTickets += count;
            totalValue += val;

            // Category Grouping
            const cat = item.category || 'Uncategorized';
            if (!categoryStats[cat]) categoryStats[cat] = { count: 0, tickets: 0, value: 0 };
            categoryStats[cat].count += 1;
            categoryStats[cat].tickets += count;
            categoryStats[cat].value += val;

            // Variant Grouping (e.g. "Amusement ₹100")
            const variantKey = `${cat} ₹${item.price}`;
            if (!variantStats[variantKey]) variantStats[variantKey] = { count: 0, tickets: 0, value: 0 };
            variantStats[variantKey].count += 1;
            variantStats[variantKey].tickets += count;
            variantStats[variantKey].value += val;
        }
    });

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Ticket Stock</h1>
                <p className="text-gray-500">Register ticket books and inventory by category and rate.</p>
            </div>

            {/* Global Summary */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="bg-blue-50 border-blue-100">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-blue-700">Total Stock Value</CardTitle>
                        <IndianRupee className="h-4 w-4 text-blue-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-blue-700">₹{totalValue.toLocaleString()}</div>
                        <p className="text-xs text-blue-600">Potential Revenue</p>
                    </CardContent>
                </Card>
                <Card className="bg-green-50 border-green-100">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-green-700">Total Available Tickets</CardTitle>
                        <Ticket className="h-4 w-4 text-green-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-green-700">{totalTickets.toLocaleString()}</div>
                        <p className="text-xs text-green-600">Tickets in stock</p>
                    </CardContent>
                </Card>
                <Card className="bg-purple-50 border-purple-100">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-purple-700">Total Bundles</CardTitle>
                        <Package className="h-4 w-4 text-purple-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-purple-700">{totalBundles}</div>
                        <p className="text-xs text-purple-600">Active sets</p>
                    </CardContent>
                </Card>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Category Breakdown */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-base flex items-center gap-2">
                            <Layers className="h-4 w-4 text-gray-500" />
                            Category Breakdown
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            {Object.entries(categoryStats).map(([cat, stats]) => (
                                <div key={cat} className="flex items-center justify-between border-b pb-2 last:border-0 last:pb-0">
                                    <div>
                                        <div className="font-medium text-sm">{cat}</div>
                                        <div className="text-xs text-gray-500">{stats.count} bundles</div>
                                    </div>
                                    <div className="text-right">
                                        <div className="font-bold text-sm">₹{stats.value.toLocaleString()}</div>
                                        <div className="text-xs text-gray-500">{stats.tickets.toLocaleString()} tickets</div>
                                    </div>
                                </div>
                            ))}
                            {Object.keys(categoryStats).length === 0 && <div className="text-sm text-gray-500 italic">No stock available.</div>}
                        </div>
                    </CardContent>
                </Card>

                {/* Variant Breakdown */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-base flex items-center gap-2">
                            <Tag className="h-4 w-4 text-gray-500" />
                            Stock Variants (Category & Rate)
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            {Object.entries(variantStats).sort().map(([variant, stats]) => (
                                <div key={variant} className="flex items-center justify-between border-b pb-2 last:border-0 last:pb-0">
                                    <div>
                                        <div className="font-medium text-sm">{variant}</div>
                                        <div className="text-xs text-gray-500">{stats.count} bundles</div>
                                    </div>
                                    <div className="text-right">
                                        <div className="font-bold text-sm">₹{stats.value.toLocaleString()}</div>
                                        <div className="text-xs text-gray-500">{stats.tickets.toLocaleString()} tickets</div>
                                    </div>
                                </div>
                            ))}
                            {Object.keys(variantStats).length === 0 && <div className="text-sm text-gray-500 italic">No stock available.</div>}
                        </div>
                    </CardContent>
                </Card>
            </div>

            <TicketStockList initialInventory={inventory} eventId={session.activeEventId} />
        </div>
    );
}
