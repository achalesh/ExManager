import { getSession } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { AssignStockDialog } from '@/components/ticketing/AssignStockDialog';
import { ReconcileDialog } from '@/components/ticketing/ReconcileDialog';
import { DeleteAssignmentButton } from '@/components/ticketing/DeleteAssignmentButton';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Plus } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default async function StaffTicketingPage() {
    const session = await getSession();
    if (!session || !['Admin', 'Manager', 'Office'].includes(session.roleName)) {
        redirect('/dashboard');
    }

    // 1. Fetch Data for Dialogs
    const staffList = await prisma.staff.findMany({
        where: {
            department: {
                contains: 'Booking'
            }
        },
        orderBy: { name: 'asc' }
    });

    let inventoryList = await prisma.ticketInventory.findMany({
        where: { status: 'Available' },
        orderBy: { seriesLabel: 'asc' }
    });

    // Sort: Used (partially consumed) tickets on top
    inventoryList.sort((a, b) => {
        const aUsed = a.currentNumber > a.startNumber;
        const bUsed = b.currentNumber > b.startNumber;
        if (aUsed && !bUsed) return -1;
        if (!aUsed && bUsed) return 1;
        return 0; // Maintain original order (seriesLabel asc)
    });

    const ticketTypes = await prisma.ticketType.findMany({
        // where: { eventId: session.activeEventId }, // Should filter by active event
        orderBy: { name: 'asc' }
    });

    // 2. Fetch Active Assignments
    const activeAssignments = await prisma.staffTicketAssignment.findMany({
        where: { status: 'Assigned' },
        include: {
            staff: true,
            ticketType: true,
        },
        orderBy: { assignedDate: 'desc' }
    });



    return (
        <div className="max-w-7xl mx-auto space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Ticket Allocation</h1>
                    <p className="text-gray-600">Allocate ticket bundles to booking staff and reconcile daily sales.</p>
                </div>
                <div className="flex gap-2">
                    <Link href="/dashboard/ticketing/settlements">
                        <Button variant="outline">
                            Settlements
                        </Button>
                    </Link>
                    <AssignStockDialog
                        staffList={staffList}
                        inventoryList={inventoryList}
                        ticketTypes={ticketTypes}
                    />
                </div>
            </div>


            <div className="grid gap-6">


                <Card>
                    <CardHeader>
                        <CardTitle>Active Assignments</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {activeAssignments.length > 0 ? (
                            <div className="overflow-x-auto">
                                <table className="min-w-full divide-y divide-gray-200">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Staff</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ticket Details</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Assigned Quantity</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-gray-200">
                                        {activeAssignments.map((viz) => (
                                            <tr key={viz.id} className="hover:bg-gray-50">
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="font-medium text-gray-900">{viz.staff.name}</div>
                                                    <div className="text-xs text-gray-500">{viz.staff.contactNo}</div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="text-sm text-indigo-700 font-medium">{viz.ticketType.name}</div>
                                                    <div className="text-xs text-gray-500">
                                                        Series: {viz.seriesLabel} ({viz.startNumber} - {viz.endNumber})
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <Badge variant="secondary" className="text-sm">
                                                        {viz.assignedCount}
                                                    </Badge>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                    {new Date(viz.assignedDate).toLocaleDateString()}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-right">
                                                    <div className="flex justify-end gap-2">
                                                        <AssignStockDialog
                                                            staffList={staffList}
                                                            inventoryList={inventoryList}
                                                            ticketTypes={ticketTypes}
                                                            defaultStaffId={viz.staff.id}
                                                            trigger={
                                                                <div className="inline-flex h-9 w-9 items-center justify-center whitespace-nowrap rounded-md border border-input bg-transparent text-sm font-medium shadow-sm transition-colors hover:bg-accent hover:text-accent-foreground disabled:pointer-events-none disabled:opacity-50 cursor-pointer text-blue-600 hover:text-blue-800 hover:bg-blue-50">
                                                                    <Plus className="h-4 w-4" />
                                                                </div>
                                                            }
                                                        />
                                                        <DeleteAssignmentButton id={viz.id} />
                                                        <ReconcileDialog assignment={viz} />
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        ) : (
                            <div className="text-center py-10 text-gray-500">
                                No active ticket assignments. Assign stock to start.
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
