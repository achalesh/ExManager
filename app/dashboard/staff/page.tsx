import { getSession } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { getEventStaff, deleteStaff } from '@/app/staff-actions';
import { AddStaffDialog } from '@/components/AddStaffDialog';
import { EditStaffDialog } from '@/components/EditStaffDialog';
import { DeleteStaffButton } from '@/components/DeleteStaffButton';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Phone, MapPin, Calendar, CreditCard } from 'lucide-react';

export default async function StaffPage() {
    const session = await getSession();

    if (!session || !['Admin', 'Manager'].includes(session.roleName)) {
        redirect('/dashboard');
    }

    if (!session.activeEventId) {
        return <div className="p-8 text-center text-gray-500">Please select an event first.</div>;
    }

    const staffList = await getEventStaff(session.activeEventId);

    // Group by Department
    const departments = ['Office', 'Amusement', 'Security', 'Booking'];

    return (
        <div className="max-w-7xl mx-auto">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 mb-2">Event Staff</h1>
                    <p className="text-gray-600">Employee directory for {session.activeEventName}</p>
                </div>
                <AddStaffDialog eventId={session.activeEventId} />
            </div>

            {departments.map(dept => {
                const deptStaff = staffList.filter(s => s.department === dept);
                if (deptStaff.length === 0) return null;

                return (
                    <div key={dept} className="mb-10">
                        <div className="flex items-center gap-2 mb-4">
                            <h2 className="text-xl font-semibold text-gray-800">{dept} Department</h2>
                            <Badge variant="secondary" className="bg-gray-100 text-gray-600 rounded-full px-2">
                                {deptStaff.length}
                            </Badge>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {deptStaff.map(staff => (
                                <Card key={staff.id} className="overflow-hidden hover:shadow-md transition-shadow">
                                    <div className="p-6">
                                        <div className="flex items-start gap-4">
                                            {/* Simplified Avatar using native img */}
                                            <div className="h-16 w-16 rounded-full border-2 border-white shadow-sm overflow-hidden bg-indigo-100 flex items-center justify-center flex-shrink-0">
                                                {staff.photoUrl ? (
                                                    <img
                                                        src={staff.photoUrl}
                                                        alt={staff.name}
                                                        className="h-full w-full object-cover"
                                                    />
                                                ) : (
                                                    <span className="text-lg font-bold text-indigo-700">
                                                        {staff.name.charAt(0).toUpperCase()}
                                                    </span>
                                                )}
                                            </div>

                                            <div className="flex-1 min-w-0">
                                                <h3 className="text-lg font-bold text-gray-900 truncate">{staff.name}</h3>
                                                <p className="text-sm text-gray-500 flex items-center mt-1">
                                                    <CreditCard className="w-3 h-3 mr-1" />
                                                    ID: {staff.adharNumber}
                                                </p>
                                            </div>
                                        </div>

                                        <div className="mt-4 space-y-2 text-sm">
                                            <div className="flex items-center text-gray-600">
                                                <Phone className="w-4 h-4 mr-2 text-gray-400" />
                                                {staff.contactNo}
                                                {staff.secContact && <span className="text-gray-400 ml-1">/ {staff.secContact}</span>}
                                            </div>
                                            <div className="flex items-center text-gray-600">
                                                <Calendar className="w-4 h-4 mr-2 text-gray-400" />
                                                {staff.age} years ({new Date(staff.dob).toLocaleDateString()})
                                            </div>
                                            <div className="flex items-start text-gray-600">
                                                <MapPin className="w-4 h-4 mr-2 text-gray-400 mt-0.5" />
                                                <span className="line-clamp-2">{staff.address}</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="bg-gray-50 px-6 py-3 border-t border-gray-100 flex justify-between items-center">
                                        <Badge variant="outline" className="text-xs bg-white">
                                            {staff.department}
                                        </Badge>
                                        <div className="flex gap-1">
                                            <EditStaffDialog staff={staff} />
                                            <DeleteStaffButton id={staff.id} name={staff.name} />
                                        </div>
                                    </div>
                                </Card>
                            ))}
                        </div>
                    </div>
                );
            })}

            {staffList.length === 0 && (
                <div className="text-center py-20 bg-gray-50 rounded-lg border-2 border-dashed border-gray-200">
                    <p className="text-gray-500 text-lg">No staff members added yet.</p>
                    <p className="text-gray-400">Click "Add Staff Member" to begin building your team.</p>
                </div>
            )}
        </div>
    );
}
