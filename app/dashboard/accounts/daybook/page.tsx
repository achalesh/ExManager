import { getSession } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { getDailyTransactions } from '@/app/accounts-actions';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AddTransactionDialog } from '@/components/accounts/AddTransactionDialog';
import { DeleteTransactionButton } from '@/components/accounts/DeleteTransactionButton';
import { ArrowUpCircle, ArrowDownCircle, Wallet } from 'lucide-react';

export default async function AccountsPage({ searchParams }: { searchParams: Promise<{ date?: string }> }) {
    const session = await getSession();
    if (!session) redirect('/login');

    const params = await searchParams;
    const date = params.date || new Date().toISOString().slice(0, 10);
    const { transactions, dailySummary, eventSummary } = await getDailyTransactions(date);

    return (
        <div className="max-w-7xl mx-auto space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Daily Accounts</h1>
                    <p className="text-gray-600">Track daily income and expenditure.</p>
                </div>
                <div className="flex items-center gap-4">
                    <form className="flex items-center gap-2">
                        <input
                            type="date"
                            name="date"
                            defaultValue={date}
                            className="border rounded-md px-3 py-2 text-sm"
                        />
                        <button type="submit" className="bg-gray-900 text-white px-3 py-2 rounded-md text-sm">Go</button>
                    </form>
                    <AddTransactionDialog />
                </div>
            </div>

            {/* EVENT Summary (Top Cards) */}
            <h2 className="text-xl font-semibold text-gray-800">Event Overview (All Time)</h2>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <Card className="bg-green-50 border-green-100">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-green-700">Event Total Income</CardTitle>
                        <ArrowUpCircle className="h-4 w-4 text-green-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-green-700">₹{Math.round(eventSummary.income).toLocaleString('en-IN')}</div>
                    </CardContent>
                </Card>
                <Card className="bg-red-50 border-red-100">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-red-700">Event Total Expense</CardTitle>
                        <ArrowDownCircle className="h-4 w-4 text-red-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-red-700">₹{Math.round(eventSummary.expense).toLocaleString('en-IN')}</div>
                    </CardContent>
                </Card>
                <Card className="bg-purple-50 border-purple-100">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-purple-700">Company Account (All Time)</CardTitle>
                        <Wallet className="h-4 w-4 text-purple-600" />
                    </CardHeader>
                    <CardContent>
                        <div className={`text-2xl font-bold ${eventSummary.companyBalance < 0 ? 'text-red-700' : 'text-purple-700'}`}>
                            ₹{Math.round(eventSummary.companyBalance).toLocaleString('en-IN')}
                        </div>
                    </CardContent>
                </Card>
                <Card className="bg-blue-50 border-blue-100">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-blue-700">Cash in Hand (All Time)</CardTitle>
                        <Wallet className="h-4 w-4 text-blue-600" />
                    </CardHeader>
                    <CardContent>
                        <div className={`text-2xl font-bold ${eventSummary.cashBalance < 0 ? 'text-red-700' : 'text-blue-700'}`}>
                            ₹{Math.round(eventSummary.cashBalance).toLocaleString('en-IN')}
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* DAILY Summary (Sub Cards) */}
            <h2 className="text-xl font-semibold text-gray-800">Daily Overview ({new Date(date).toLocaleDateString()})</h2>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <Card className="bg-white border-gray-200">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-gray-600">Daily Income</CardTitle>
                        <ArrowUpCircle className="h-4 w-4 text-green-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-gray-900">₹{Math.round(dailySummary.income).toLocaleString('en-IN')}</div>
                        <div className="flex gap-4 mt-1 text-xs text-gray-500">
                            <div>Cash: <span className="font-semibold">₹{Math.round(dailySummary.cashIncome || 0).toLocaleString('en-IN')}</span></div>
                            <div>UPI: <span className="font-semibold">₹{Math.round(dailySummary.upiIncome || 0).toLocaleString('en-IN')}</span></div>
                        </div>
                    </CardContent>
                </Card>
                <Card className="bg-white border-gray-200">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-gray-600">Daily Expense</CardTitle>
                        <ArrowDownCircle className="h-4 w-4 text-red-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-gray-900">₹{Math.round(dailySummary.expense).toLocaleString('en-IN')}</div>
                    </CardContent>
                </Card>
                <Card className="bg-white border-gray-200">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-gray-600">Daily Company Net</CardTitle>
                        <Wallet className="h-4 w-4 text-purple-500" />
                    </CardHeader>
                    <CardContent>
                        <div className={`text-2xl font-bold ${dailySummary.companyBalance < 0 ? 'text-red-600' : 'text-purple-600'}`}>
                            ₹{Math.round(dailySummary.companyBalance).toLocaleString('en-IN')}
                        </div>
                        <div className="flex flex-col gap-1 mt-2 text-xs text-gray-500 border-t pt-2">
                            <div className="flex justify-between"><span>Amusement:</span> <span className="font-semibold">₹{Math.round(dailySummary.upiAmusement || 0).toLocaleString('en-IN')}</span></div>
                            <div className="flex justify-between"><span>Entrance:</span> <span className="font-semibold">₹{Math.round(dailySummary.upiEntrance || 0).toLocaleString('en-IN')}</span></div>
                            <div className="flex justify-between"><span>Office:</span> <span className="font-semibold">₹{Math.round(dailySummary.upiOffice || 0).toLocaleString('en-IN')}</span></div>
                        </div>
                    </CardContent>
                </Card>
                <Card className="bg-white border-gray-200">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-gray-600">Daily Cash Net</CardTitle>
                        <Wallet className="h-4 w-4 text-blue-500" />
                    </CardHeader>
                    <CardContent>
                        <div className={`text-2xl font-bold ${dailySummary.cashBalance < 0 ? 'text-red-600' : 'text-blue-600'}`}>
                            ₹{Math.round(dailySummary.cashBalance).toLocaleString('en-IN')}
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Transactions Table for Selected Date */}
            <Card>
                <CardHeader>
                    <CardTitle>Transactions List</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Method</th>
                                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
                                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {transactions.length > 0 ? (
                                    transactions.map((tx: any) => (
                                        <tr key={tx.id} className="hover:bg-gray-50">
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                {new Date(tx.transactionDate).toLocaleDateString()}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${tx.type === 'Income' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                                                    }`}>
                                                    {tx.type}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                                {tx.category}
                                            </td>
                                            <td className="px-6 py-4 text-sm text-gray-500 max-w-xs truncate">
                                                {tx.description || '-'}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                {tx.paymentMethod}
                                            </td>
                                            <td className={`px-6 py-4 whitespace-nowrap text-sm font-bold text-right ${tx.type === 'Income' ? 'text-green-600' : 'text-red-600'
                                                }`}>
                                                ₹{Math.round(tx.amount).toLocaleString('en-IN')}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-500">
                                                {tx.recordedBy || '-'}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                                <DeleteTransactionButton id={tx.id} source={tx.source} />
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan={8} className="px-6 py-10 text-center text-gray-500">
                                            No transactions found for this date.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </CardContent>
            </Card>

            {/* Recent Activity Section */}
            <RecentActivitySection />
        </div>
    );
}

import { getRecentTransactions } from '@/app/accounts-actions';

async function RecentActivitySection() {
    const recentTransactions = await getRecentTransactions(10);

    return (
        <Card>
            <CardHeader>
                <CardTitle>Recent Activity (Last 10)</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Method</th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {recentTransactions.length > 0 ? (
                                recentTransactions.map((tx: any) => (
                                    <tr key={tx.id} className="hover:bg-gray-50">
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            {new Date(tx.transactionDate).toLocaleString()}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${tx.type === 'Income' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                                                }`}>
                                                {tx.type}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                            {tx.category}
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-500 max-w-xs truncate">
                                            {tx.description || '-'}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            {tx.paymentMethod}
                                        </td>
                                        <td className={`px-6 py-4 whitespace-nowrap text-sm font-bold text-right ${tx.type === 'Income' ? 'text-green-600' : 'text-red-600'
                                            }`}>
                                            ₹{Math.round(tx.amount).toLocaleString('en-IN')}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-500">
                                            {tx.recordedBy || '-'}
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={7} className="px-6 py-10 text-center text-gray-500">
                                        No recent transactions.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </CardContent>
        </Card>
    );
}
