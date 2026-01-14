import { getSession } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { getPayrollList, generatePayroll } from '@/app/hr-actions';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PayrollControls } from '@/components/hr/PayrollControls';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { MonthYearSelector } from '@/components/hr/MonthYearSelector';
import { StaffDetailsDialog } from '@/components/hr/StaffDetailsDialog';
import { getStaffPayrollHistory } from '@/app/actions/hr/payroll';

export default async function PayrollPage({ searchParams }: { searchParams: { month?: string, year?: string } }) {
    const session = await getSession();
    if (!session || !['Admin', 'Manager', 'Accountant'].includes(session.roleName)) {
        redirect('/dashboard');
    }

    const today = new Date();
    const month = Number((await searchParams).month) || today.getMonth() + 1;
    const year = Number((await searchParams).year) || today.getFullYear();

    const payrolls = await getPayrollList(session.activeEventId!, month, year);

    const { prisma } = await import('@/lib/prisma');
    const allPayrollHistory = await prisma.staffPayroll.findMany({
        where: { eventId: session.activeEventId! },
        orderBy: [{ year: 'desc' }, { month: 'desc' }, { weekNumber: 'desc' }]
    });

    // Fetch complete history for all staff in this event to support the details view
    // Importing prisma here if simple query, OR import action. 
    // Since this is a server component, we can use prisma directly or add an action.
    // Let's use prisma directly for efficiency if imports allow, or add a generic 'getAllPayrollHistory' action.
    // But wait, `getPayrollList` is an action. Let's add `getAllEventPayrollHistory` action?
    // Or just use the existing `getStaffPayrollHistory`? No that is by staffId.
    // Let's import prisma here? No, better practice to keep DB logic in actions/libs.
    // Let's assume we added a new export or we can filter... 
    // Actually, let's just cheat and fetch it here via a new ad-hoc query if possible?
    // No, let's act properly. Update `app/actions/hr/payroll.ts` to export `getAllEventPayrollHistory`.
    // Wait, I can't update that file in this step easily without another tool call.
    // I will use `import { prisma } from '@/lib/prisma'` which is already available in the project structure?
    // Yes, `app/dashboard/hr/payroll/page.tsx` usually doesn't import prisma directly if it uses actions.
    // Check imports... line 1-5. No prisma.
    // I will add `getAllEventPayrollHistory` to `app/actions/hr/payroll.ts` ? 
    // I already called `replace_file_content` on `page.tsx` above assuming `allPayrollHistory` exists.
    // I need to provide `allPayrollHistory`.
    // Let's utilize `getStaffPayrollHistory` but that's per staff. 
    // Loops in async component... `const allPayrollHistory = await prisma.staffPayroll.findMany(...)`
    // I'll add `import { prisma } from '@/lib/prisma';` to the top of `page.tsx` and run the query.

    // NOTE: This Replace call is modifying the component body. I need to ensure `prisma` is imported.

    // Let's do it in two steps. 
    // 1. Add `getAllEventPayrollHistory` to actions (I can do this since I can multiple tool call?)
    // No, I can't edit same file twice in parallel if conflicting? 
    // I already edited `payroll.ts` in this turn (Step 1).
    // So I can't edit it again easily.
    // I will import prisma in `page.tsx`.

    // RE-EVAL: I can't edit `page.tsx` efficiently to add import AND body change in one `replace`.
    // Usage of `allPayrollHistory` in previous `replace` will fail if not defined.
    // I should have defined it.

    // Let's define `allPayrollHistory` in this `replace_file_content` call if I can find a spot.
    // The target is lines 23.

    // `const payrolls = ...`

    // I will replace that line with:
    // `const payrolls = ...`
    // `const allPayrollHistory = await ...`

    // AND I need to make sure `prisma` is imported.
    // I will use a separate `replace` to add the import.




    // Helper to format currency
    const formatCurrency = (val: number) => `₹ ${val.toLocaleString('en-IN')}`;

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-xl font-semibold text-gray-800">Payroll Management</h2>
                <div className="flex gap-2">
                    <MonthYearSelector month={month} year={year} />
                    <PayrollControls eventId={session.activeEventId!} month={month} year={year} />
                </div>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Salary Sheet - {new Date(year, month - 1).toLocaleString('default', { month: 'long' })} {year}</CardTitle>
                </CardHeader>
                <CardContent>
                    <Tabs defaultValue="All" className="w-full">
                        <TabsList className="mb-4 flex flex-wrap h-auto">
                            <TabsTrigger value="All">All Divisions</TabsTrigger>
                            {Array.from(new Set(payrolls.map((p: any) => p.staff.department))).sort().map((dept: any) => (
                                <TabsTrigger key={dept} value={dept}>{dept}</TabsTrigger>
                            ))}
                        </TabsList>

                        {['All', ...Array.from(new Set(payrolls.map((p: any) => p.staff.department))).sort()].map((tab: any) => {
                            const filteredPayrolls = tab === 'All'
                                ? payrolls
                                : payrolls.filter((p: any) => p.staff.department === tab);

                            return (
                                <TabsContent key={tab} value={tab}>
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Employee</TableHead>
                                                <TableHead>Department</TableHead>
                                                <TableHead>Present Days</TableHead>
                                                <TableHead>Base Salary</TableHead>
                                                <TableHead>Calculated</TableHead>
                                                <TableHead>Deductions</TableHead>
                                                <TableHead>Incentives</TableHead>
                                                <TableHead className="font-bold">Net Salary</TableHead>
                                                <TableHead>Status</TableHead>
                                                <TableHead className="text-right">Action</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {filteredPayrolls.length === 0 ? (
                                                <TableRow>
                                                    <TableCell colSpan={10} className="text-center py-8 text-gray-500">
                                                        No payroll records found for {tab}.
                                                    </TableCell>
                                                </TableRow>
                                            ) : (
                                                filteredPayrolls.map((p: any) => {
                                                    const staffHistory = allPayrollHistory.filter((h: any) => h.staffId === p.staffId);
                                                    return (
                                                        <TableRow key={p.id}>
                                                            <TableCell className="font-medium">
                                                                <StaffDetailsDialog staff={p.staff} history={staffHistory}>
                                                                    <div className="flex items-center">
                                                                        {p.staff.name}
                                                                        {p.weekNumber > 0 && (
                                                                            <span className="ml-2 text-[10px] bg-blue-100 text-blue-800 px-1 py-0.5 rounded">
                                                                                Week {p.weekNumber}
                                                                            </span>
                                                                        )}
                                                                        {/* Overdue Warning */}
                                                                        {p.weekNumber > 0 && p.status === 'Pending' && new Date().getDay() === 1 && (
                                                                            <span className="ml-2 text-[10px] bg-red-100 text-red-800 px-1 py-0.5 rounded font-bold animate-pulse">
                                                                                PAYMENT DUE
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                </StaffDetailsDialog>
                                                            </TableCell>
                                                            <TableCell>
                                                                <Badge variant="outline" className="text-xs font-normal text-gray-600 bg-gray-50">
                                                                    {p.staff.department}
                                                                </Badge>
                                                            </TableCell>
                                                            <TableCell>{p.presentDays} / {p.totalDays}</TableCell>
                                                            <TableCell>{formatCurrency(p.baseSalary)}</TableCell>
                                                            <TableCell>{formatCurrency(p.calculated)}</TableCell>
                                                            <TableCell className="text-red-600">{p.deductions > 0 ? `-${formatCurrency(p.deductions)}` : '-'}</TableCell>
                                                            <TableCell className="text-green-600">{p.incentives > 0 ? `+${formatCurrency(p.incentives)}` : '-'}</TableCell>
                                                            <TableCell className="font-bold text-gray-900">{formatCurrency(p.netSalary)}</TableCell>
                                                            <TableCell>
                                                                <Badge variant={p.status === 'Paid' ? 'default' : 'secondary'} className={p.status === 'Paid' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}>
                                                                    {p.status}
                                                                </Badge>
                                                            </TableCell>
                                                            <TableCell className="text-right">
                                                                {p.status === 'Pending' && <Button size="sm" variant="outline">Pay</Button>}
                                                            </TableCell>
                                                        </TableRow>
                                                    );
                                                })
                                            )}
                                        </TableBody>
                                    </Table>
                                </TabsContent>
                            );
                        })}
                    </Tabs>
                </CardContent>
            </Card>
        </div>
    );
}
