'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { getAmusementLedger } from '@/app/accounts-actions';
import { Loader2 } from 'lucide-react';

interface Owner {
    id: number;
    name: string;
}

export function AmusementLedgerInterface({ owners }: { owners: Owner[] }) {
    const [selectedOwnerId, setSelectedOwnerId] = useState<string>('');
    const [ledger, setLedger] = useState<any[]>([]);
    const [summary, setSummary] = useState({ totalCredit: 0, totalDebit: 0, balance: 0 });
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!selectedOwnerId) {
            setLedger([]);
            setSummary({ totalCredit: 0, totalDebit: 0, balance: 0 });
            return;
        }

        async function fetchData() {
            setLoading(true);
            try {
                const result = await getAmusementLedger(selectedOwnerId);
                setLedger(result.ledger);
                setSummary(result.summary);
            } catch (error) {
                console.error("Failed to fetch ledger", error);
            } finally {
                setLoading(false);
            }
        }

        fetchData();
    }, [selectedOwnerId]);

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>Select Amusement Owner</CardTitle>
                </CardHeader>
                <CardContent>
                    <Select value={selectedOwnerId} onValueChange={setSelectedOwnerId}>
                        <SelectTrigger className="w-[300px]">
                            <SelectValue placeholder="Select Owner" />
                        </SelectTrigger>
                        <SelectContent>
                            {owners.map(owner => (
                                <SelectItem key={owner.id} value={owner.id.toString()}>
                                    {owner.name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </CardContent>
            </Card>

            {selectedOwnerId && (
                <>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <Card className="bg-green-50">
                            <CardContent className="pt-6">
                                <div className="text-sm font-medium text-green-600">Total Revenue Share (Credit)</div>
                                <div className="text-2xl font-bold text-green-700">₹{Math.round(summary.totalCredit).toLocaleString('en-IN')}</div>
                            </CardContent>
                        </Card>
                        <Card className="bg-red-50">
                            <CardContent className="pt-6">
                                <div className="text-sm font-medium text-red-600">Total Payments (Debit)</div>
                                <div className="text-2xl font-bold text-red-700">₹{Math.round(summary.totalDebit).toLocaleString('en-IN')}</div>
                            </CardContent>
                        </Card>
                        <Card className="bg-blue-50">
                            <CardContent className="pt-6">
                                <div className="text-sm font-medium text-blue-600">Balance Payable</div>
                                <div className={`text-2xl font-bold ${summary.balance < 0 ? 'text-red-700' : 'text-blue-700'}`}>
                                    ₹{Math.round(summary.balance).toLocaleString('en-IN')}
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    <Card>
                        <CardHeader>
                            <CardTitle>Ledger Entries</CardTitle>
                        </CardHeader>
                        <CardContent>
                            {loading ? (
                                <div className="flex justify-center p-8">
                                    <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
                                </div>
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="min-w-full divide-y divide-gray-200">
                                        <thead className="bg-gray-50">
                                            <tr>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Description</th>
                                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Credit (Share)</th>
                                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Debit (Paid)</th>
                                            </tr>
                                        </thead>
                                        <tbody className="bg-white divide-y divide-gray-200">
                                            {ledger.length > 0 ? (
                                                ledger.map((entry) => (
                                                    <tr key={entry.id}>
                                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                            {new Date(entry.date).toLocaleDateString()}
                                                        </td>
                                                        <td className="px-6 py-4 text-sm text-gray-900">
                                                            {entry.description}
                                                        </td>
                                                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium text-green-600">
                                                            ₹{Math.round(entry.credit).toLocaleString('en-IN')}
                                                        </td>
                                                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium text-red-600">
                                                            ₹{Math.round(entry.debit).toLocaleString('en-IN')}
                                                        </td>
                                                    </tr>
                                                ))
                                            ) : (
                                                <tr>
                                                    <td colSpan={4} className="px-6 py-10 text-center text-gray-500">
                                                        No entries found.
                                                    </td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </>
            )}
        </div>
    );
}
