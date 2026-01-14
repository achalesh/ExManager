import { getSession } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { getEmployees } from '@/app/hr-actions';
import { AddEmployeeDialog } from '@/components/hr/AddEmployeeDialog';
import { EditEmployeeDialog } from '@/components/hr/EditEmployeeDialog';
import { DeleteEmployeeButton } from '@/components/hr/DeleteEmployeeButton';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";

export default async function EmployeesPage() {
    const session = await getSession();

    if (!session || !['Admin', 'Manager', 'Accountant'].includes(session.roleName)) {
        redirect('/dashboard');
    }

    if (!session.activeEventId) {
        return <div className="p-8 text-center text-gray-500">Please select an event first.</div>;
    }

    const employees = await getEmployees(session.activeEventId);
    const departments = ['All', 'Booking', 'Amusement', 'Security', 'Office'];

    // Helper to format currency
    const formatCurrency = (val: number) => `₹ ${val.toLocaleString('en-IN')}`;

    return (
        <div className="max-w-7xl mx-auto">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-semibold text-gray-800">Employee Directory</h2>
                <AddEmployeeDialog eventId={session.activeEventId} />
            </div>

            <Tabs defaultValue="All" className="w-full">
                <TabsList className="mb-8 flex flex-wrap h-auto gap-2 bg-transparent justify-start p-0">
                    {departments.map(dept => (
                        <TabsTrigger
                            key={dept}
                            value={dept}
                            className="data-[state=active]:bg-indigo-600 data-[state=active]:text-white border border-gray-200 bg-white px-6 py-2 shadow-sm"
                        >
                            {dept}
                            <Badge variant="secondary" className="ml-2 bg-gray-100 text-gray-600 group-data-[state=active]:bg-indigo-500 group-data-[state=active]:text-white">
                                {dept === 'All' ? employees.length : employees.filter(s => s.department === dept).length}
                            </Badge>
                        </TabsTrigger>
                    ))}
                </TabsList>

                {departments.map(dept => {
                    const deptStaff = dept === 'All' ? employees : employees.filter(s => s.department === dept);

                    return (
                        <TabsContent key={dept} value={dept}>
                            <div className="rounded-md border bg-white shadow-sm overflow-hidden">
                                <Table>
                                    <TableHeader className="bg-gray-50">
                                        <TableRow>
                                            <TableHead className="w-[80px]">Photo</TableHead>
                                            <TableHead>Basic Info</TableHead>
                                            <TableHead>Department</TableHead>
                                            <TableHead>Contact</TableHead>
                                            <TableHead>Salary</TableHead>
                                            <TableHead>Status</TableHead>
                                            <TableHead className="text-right">Actions</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {deptStaff.map((staff) => (
                                            <TableRow key={staff.id} className="hover:bg-indigo-50/30 transition-colors">
                                                <TableCell>
                                                    <div className="h-10 w-10 rounded-full overflow-hidden bg-indigo-100 flex items-center justify-center border border-gray-200">
                                                        {staff.photoUrl ? (
                                                            <img
                                                                src={staff.photoUrl}
                                                                alt={staff.name}
                                                                className="h-full w-full object-cover"
                                                            />
                                                        ) : (
                                                            <span className="text-sm font-bold text-indigo-700">
                                                                {staff.name.charAt(0).toUpperCase()}
                                                            </span>
                                                        )}
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <div>
                                                        <div className="font-medium text-gray-900">{staff.name}</div>
                                                        <div className="text-xs text-gray-500">Age: {staff.age} • ID: {staff.adharNumber}</div>
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <Badge variant="outline" className="font-normal bg-gray-50 text-gray-700 border-gray-200">
                                                        {staff.department}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell>
                                                    <div className="text-sm">
                                                        <div>{staff.contactNo}</div>
                                                        {staff.secContact && (
                                                            <div className="text-xs text-gray-500">{staff.secContact}</div>
                                                        )}
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <div className="text-sm font-medium">
                                                        {formatCurrency(staff.salaryAmount)}
                                                        <span className="text-xs text-gray-500 font-normal ml-1">
                                                            /{staff.salaryFrequency === 'Monthly' ? 'mo' : 'day'}
                                                        </span>
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <Badge
                                                        variant="secondary"
                                                        className={staff.status === 'Active'
                                                            ? 'bg-green-100 text-green-700 hover:bg-green-100'
                                                            : 'bg-gray-100 text-gray-700 hover:bg-gray-100'
                                                        }
                                                    >
                                                        {staff.status}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <div className="flex items-center justify-end gap-2">
                                                        <EditEmployeeDialog employee={staff} />
                                                        <DeleteEmployeeButton id={staff.id} name={staff.name} />
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                        {deptStaff.length === 0 && (
                                            <TableRow>
                                                <TableCell colSpan={7} className="h-24 text-center text-gray-500">
                                                    No employees found in {dept}.
                                                </TableCell>
                                            </TableRow>
                                        )}
                                    </TableBody>
                                </Table>
                            </div>
                        </TabsContent>
                    );
                })}
            </Tabs>
        </div>
    );
}
