'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowUpCircle, ArrowDownCircle, Wallet, Building } from 'lucide-react';

interface Transaction {
    id: number;
    type: string;
    category: string;
    amount: number;
    paymentMethod: string;
    description: string | null;
    transactionDate: Date;
}

interface Summary {
    income: number;
    expense: number;
    balance: number;
    cashBalance: number;
    companyBalance: number;
}

export function CompanyLedgerInterface({
    initialTransactions,
    summary
}: {
    initialTransactions: Transaction[],
    summary: Summary
}) {
    return (
        <div className="space-y-6">
            {/* Event Overview Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card className="bg-green-50">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-green-700">Total Event Income</CardTitle>
                        <ArrowUpCircle className="h-4 w-4 text-green-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-green-700">₹{Math.round(summary.income).toLocaleString('en-IN')}</div>
                        <p className="text-xs text-green-600 mt-1">All sources included</p>
                    </CardContent>
                </Card>
                <Card className="bg-red-50">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-red-700">Total Event Expense</CardTitle>
                        <ArrowDownCircle className="h-4 w-4 text-red-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-red-700">₹{Math.round(summary.expense).toLocaleString('en-IN')}</div>
                        <p className="text-xs text-red-600 mt-1">Operational & Overhead</p>
                    </CardContent>
                </Card>
                <Card className="bg-blue-50">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-blue-700">Company Account</CardTitle>
                        <Building className="h-4 w-4 text-blue-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-blue-700">₹{Math.round(summary.companyBalance).toLocaleString('en-IN')}</div>
                        <p className="text-xs text-blue-600 mt-1">Net Banking/UPI Balance</p>
                    </CardContent>
                </Card>
                <Card className="bg-amber-50">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-amber-700">Cash in Hand</CardTitle>
                        <Wallet className="h-4 w-4 text-amber-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-amber-700">₹{Math.round(summary.cashBalance).toLocaleString('en-IN')}</div>
                        <p className="text-xs text-amber-600 mt-1">Physical Cash Balance</p>
                    </CardContent>
                </Card>
            </div>

            {/* Ledger / Transactions List */}
            <Card>
                <CardHeader>
                    <CardTitle>Combined Ledger (Recent 100)</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Method</th>
                                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Income</th>
                                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Expense</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {initialTransactions.map((tx) => (
                                    <tr key={tx.id}>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            {new Date(tx.transactionDate).toLocaleDateString()}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                            {tx.category}
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-500 max-w-xs truncate">
                                            {tx.description || '-'}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            {tx.paymentMethod}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium text-green-600">
                                            {tx.type === 'Income' ? `₹${Math.round(tx.amount).toLocaleString('en-IN')}` : '-'}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium text-red-600">
                                            {tx.type === 'Expense' ? `₹${Math.round(tx.amount).toLocaleString('en-IN')}` : '-'}
                                        </td>
                                    </tr>
                                ))}
                                {initialTransactions.length === 0 && (
                                    <tr>
                                        <td colSpan={6} className="px-6 py-10 text-center text-gray-500">
                                            No transactions found.
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
