
import { getSession } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { getStaffAccounts } from '@/app/staff-ticketing-actions';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { SettleAccountButton } from '@/components/ticketing/SettleAccountButton';
import { UndoReconcileButton } from '@/components/ticketing/UndoReconcileButton';
import { BulkSettleButton } from '@/components/ticketing/BulkSettleButton';
import { PrintButton } from '@/components/PrintButton';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default async function SettlementsPage() {
    const session = await getSession();
    if (!session || !['Admin', 'Manager', 'Office'].includes(session.roleName)) {
        redirect('/dashboard');
    }

    const unsettledAccounts = await getStaffAccounts();
    const totalDifference = unsettledAccounts.reduce((sum: number, acc: any) => sum + (acc.difference || ((acc.cashReceived + (acc.upiReceived || 0)) - acc.totalAmount)), 0);
    const allIds = unsettledAccounts.map((a: any) => a.id);

    return (
        <div className="max-w-7xl mx-auto space-y-6">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Link href="/dashboard/ticketing/staff" className="print:hidden">
                        <Button variant="ghost" size="icon">
                            <ArrowLeft className="h-4 w-4" />
                        </Button>
                    </Link>
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900">Pending Settlements</h1>
                        <p className="text-gray-600 print:hidden">Review and settle staff accounts with discrepancies.</p>
                        <p className="hidden print:block text-sm text-gray-500">Printed on {new Date().toLocaleDateString()}</p>
                    </div>
                </div>
                <div className="flex items-center gap-2 print:hidden">
                    <PrintButton />
                    {unsettledAccounts.length > 0 && (
                        <BulkSettleButton ids={allIds} totalDifference={totalDifference} />
                    )}
                </div>
            </div>

            <Card className="print:shadow-none print:border-none">
                <CardHeader className="print:hidden">
                    <CardTitle>Settlements</CardTitle>
                </CardHeader>
                <CardContent className="print:p-0">
                    {unsettledAccounts.length > 0 ? (
                        <div className="overflow-x-auto print:overflow-visible">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50 print:bg-white">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Staff</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ticket Type</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Return Date</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Sold Tickets</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Amount</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Collected</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Difference</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Remarks</th>
                                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider print:hidden">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {unsettledAccounts.map((account) => (
                                        <tr key={account.id} className="hover:bg-gray-50">
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="font-medium text-gray-900">{account.staff.name}</div>
                                                <div className="text-xs text-gray-500">{account.staff.contactNo}</div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-semibold">
                                                {account.ticketType?.name}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                {account.returnDate ? new Date(account.returnDate).toLocaleDateString() : '-'}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                                {account.soldCount && account.soldCount > 0 ? (
                                                    <span>{account.startNumber} - {account.startNumber + account.soldCount - 1} <span className='text-gray-500 text-xs'>({account.soldCount})</span></span>
                                                ) : (
                                                    <span className="text-gray-500">Nil</span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                                ₹{account.totalAmount || 0}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                                ₹{(account.cashReceived || 0) + (account.upiReceived || 0)}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${(account.difference || ((account.cashReceived + (account.upiReceived || 0)) - account.totalAmount)) < 0 ? 'bg-red-100 text-red-800' :
                                                    (account.difference || ((account.cashReceived + (account.upiReceived || 0)) - account.totalAmount)) > 0 ? 'bg-green-100 text-green-800' :
                                                        'bg-gray-100 text-gray-800'
                                                    }`}>
                                                    {account.difference !== null && account.difference !== undefined ? `₹${account.difference}` : `₹${(account.cashReceived + (account.upiReceived || 0)) - (account.totalAmount || 0)}`}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-sm text-gray-500 max-w-xs truncate">
                                                {account.remarks || '-'}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-right print:hidden">
                                                <div className="flex items-center justify-end gap-2">
                                                    <UndoReconcileButton id={account.id} />
                                                    <SettleAccountButton id={account.id} />
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <div className="text-center py-10 text-gray-500">
                            No pending settlements. All accounts are balanced!
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
