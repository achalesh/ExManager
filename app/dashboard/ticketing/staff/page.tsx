import { getSession } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { getTicketTypes, getStaffAssignments } from '@/app/ticketing-actions';
import { getInventory } from '@/app/inventory-actions';
import { getEventStaff } from '@/app/staff-actions';
import { StaffAllocationInterface } from '@/components/features/StaffAllocationInterface';

// Force rebuild
export default async function Page() {
    const session = await getSession();
    if (!session || !['Admin', 'Manager'].includes(session.roleName)) {
        redirect('/dashboard');
    }

    if (!session.activeEventId) {
        return <div className="p-8 text-center text-gray-500">Please select an event.</div>;
    }

    const [items, inventory, staffList, assignments] = await Promise.all([
        getTicketTypes(session.activeEventId),
        getInventory(session.activeEventId),
        getEventStaff(session.activeEventId),
        getStaffAssignments(session.activeEventId)
    ]);

    // Transform assignments for UI
    const formattedAssignments = assignments.map(a => ({
        ...a,
        staff: formattedStaff(a.staff), // Helper to ensure consistent shape
        assignedDate: a.assignedDate,
        soldCount: a.soldCount ?? undefined,
        returnedCount: a.returnedCount ?? undefined,
        totalAmount: a.totalAmount ?? undefined,
        cashReceived: a.cashReceived ?? undefined,
        upiReceived: a.upiReceived ?? undefined,
        difference: a.difference ?? undefined
    }));

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Stock Allocations</h1>
                <p className="text-gray-500">Manage ticket stock assignments for Counters and Staff.</p>
            </div>

            <StaffAllocationInterface
                staffList={staffList}
                items={items}
                inventory={inventory}
                assignments={formattedAssignments}
            />
        </div>
    );
}

function formattedStaff(staff: any) {
    return {
        id: staff.id,
        name: staff.name,
        department: staff.department
    };
}
