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
    const { transactions, summary } = await getDailyTransactions(date);

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
                        // Simple auto-submit on change could be done with client component, 
                        // but standard form with button or just enter works for server component
                        />
                        <button type="submit" className="bg-gray-900 text-white px-3 py-2 rounded-md text-sm">Go</button>
                    </form>
                    <AddTransactionDialog />
                </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="bg-green-50 border-green-100">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-green-700">Total Income</CardTitle>
                        <ArrowUpCircle className="h-4 w-4 text-green-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-green-700">₹{summary.income.toFixed(2)}</div>
                        <div className="flex gap-4 mt-1 text-xs text-green-600">
                            <div>Cash: <span className="font-semibold">₹{summary.cash.toFixed(2)}</span></div>
                            <div>UPI: <span className="font-semibold">₹{summary.upi.toFixed(2)}</span></div>
                        </div>
                    </CardContent>
                </Card>
                <Card className="bg-red-50 border-red-100">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-red-700">Total Expense</CardTitle>
                        <ArrowDownCircle className="h-4 w-4 text-red-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-red-700">₹{summary.expense.toFixed(2)}</div>
                        <p className="text-xs text-red-600">for {new Date(date).toLocaleDateString()}</p>
                    </CardContent>
                </Card>
                <Card className="bg-blue-50 border-blue-100">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-blue-700">Net Balance</CardTitle>
                        <Wallet className="h-4 w-4 text-blue-600" />
                    </CardHeader>
                    <CardContent>
                        <div className={`text-2xl font-bold ${summary.balance < 0 ? 'text-red-700' : 'text-blue-700'}`}>
                            ₹{summary.balance.toFixed(2)}
                        </div>
                        <p className="text-xs text-blue-600">Cash in Hand (Today)</p>
                    </CardContent>
                </Card>
            </div>

            {/* Transactions Table */}
            <Card>
                <CardHeader>
                    <CardTitle>Transactions</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Time</th>
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
                                                {new Date(tx.transactionDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
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
                                                ₹{tx.amount.toFixed(2)}
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
        </div>
    );
}
