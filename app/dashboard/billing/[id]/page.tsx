import { getSession } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { getExhibitorBillingDetails } from '@/app/billing-actions';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BillingControls } from '@/components/BillingControls';
import { ArrowLeft, Printer } from 'lucide-react';
import Link from 'next/link';
import { Separator } from '@/components/ui/separator';

export default async function ExhibitorBillingPage({ params }: { params: Promise<{ id: string }> }) {
    const session = await getSession();
    if (!session || !session.activeEventId) redirect('/dashboard');

    const resolvedParams = await params;
    const exhibitorId = parseInt(resolvedParams.id);
    const details = await getExhibitorBillingDetails(exhibitorId, session.activeEventId);

    if (!details) return <div>Exhibitor not found</div>;

    const totalPaid = details.payments.reduce((sum, p) => sum + p.amount, 0) + details.advancePaid;
    const balance = details.costs.total - totalPaid;

    return (
        <div className="max-w-5xl mx-auto p-6 space-y-8">
            <div className="flex items-center justify-between no-print">
                <div className="flex items-center gap-4">
                    <Link href="/dashboard/billing" className="text-gray-500 hover:text-gray-900">
                        <ArrowLeft className="h-5 w-5" />
                    </Link>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">{details.name}</h1>
                        <p className="text-gray-500">Billing Details</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    {/* Print Button (Simple window.print) */}
                    {/* <Button variant="ghost" onClick="window.print()"><Printer/></Button> Handled by browser for now or added to Controls */}
                    <BillingControls
                        exhibitorId={exhibitorId}
                        eventId={session.activeEventId}
                        pendingAmount={balance}
                    />
                </div>
            </div>

            {/* Financial Overview */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card>
                    <CardHeader className="pb-2"><CardTitle className="text-sm text-gray-500">Total Allocations</CardTitle></CardHeader>
                    <CardContent><div className="text-2xl font-bold">₹{details.costs.total.toLocaleString()}</div></CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2"><CardTitle className="text-sm text-gray-500">Total Paid</CardTitle></CardHeader>
                    <CardContent><div className="text-2xl font-bold text-green-600">₹{totalPaid.toLocaleString()}</div></CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2"><CardTitle className="text-sm text-gray-500">Pending Balance</CardTitle></CardHeader>
                    <CardContent><div className="text-2xl font-bold text-red-600">₹{balance.toLocaleString()}</div></CardContent>
                </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Cost Breakdown */}
                <Card>
                    <CardHeader>
                        <CardTitle>Cost Breakdown</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div>
                            <h4 className="font-semibold mb-2">Space Allocations</h4>
                            {details.bookings.map(b => (
                                <div key={b.id} className="flex justify-between text-sm py-1 border-b last:border-0 border-gray-100">
                                    <span>{b.space.label}</span>
                                    <span>₹{b.totalAmount}</span>
                                </div>
                            ))}
                            {details.bookings.length === 0 && <p className="text-sm text-gray-400">No space allocated</p>}
                        </div>
                        <div>
                            <h4 className="font-semibold mb-2">Material Allocations</h4>
                            {details.materialAllocations.map(m => (
                                <div key={m.id} className="flex justify-between text-sm py-1 border-b last:border-0 border-gray-100">
                                    <span>{m.material.name} x {m.quantity}</span>
                                    <span>₹{m.totalPrice}</span>
                                </div>
                            ))}
                        </div>
                        <div>
                            <h4 className="font-semibold mb-2">Electrical Allocations</h4>
                            {details.electricalAllocations.map(e => (
                                <div key={e.id} className="flex justify-between text-sm py-1 border-b last:border-0 border-gray-100">
                                    <span>{e.electricalItem.name} x {e.quantity}</span>
                                    <span>₹{e.totalPrice}</span>
                                </div>
                            ))}
                        </div>
                        <div>
                            <h4 className="font-semibold mb-2">Shed Allocations</h4>
                            {details.shedAllocations.map(s => (
                                <div key={s.id} className="flex justify-between text-sm py-1 border-b last:border-0 border-gray-100">
                                    <span>{s.shed.name}</span>
                                    <span>₹{s.price}</span>
                                </div>
                            ))}
                        </div>
                        <Separator />
                        <div className="flex justify-between font-bold pt-2">
                            <span>Total Cost</span>
                            <span>₹{details.costs.total.toLocaleString()}</span>
                        </div>
                    </CardContent>
                </Card>

                <div className="space-y-6">
                    {/* Invoice History */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Invoices</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                {details.invoices.map(inv => (
                                    <div key={inv.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                        <div>
                                            <div className="font-medium">{inv.invoiceNumber}</div>
                                            <div className="text-xs text-gray-500">{new Date(inv.createdAt).toLocaleDateString()}</div>
                                        </div>
                                        <div className="text-right">
                                            <div className="font-bold">₹{inv.grandTotal.toLocaleString()}</div>
                                            <Badge variant={inv.status === 'Paid' ? 'outline' : 'default'}
                                                className={inv.status === 'Paid' ? 'text-green-600 border-green-600' : ''}>
                                                {inv.status}
                                            </Badge>
                                        </div>
                                    </div>
                                ))}
                                {details.invoices.length === 0 && <p className="text-sm text-gray-400">No invoices generated</p>}
                            </div>
                        </CardContent>
                    </Card>

                    {/* Payment History */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Payments</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                {details.advancePaid > 0 && (
                                    <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg border border-green-100">
                                        <div>
                                            <div className="font-medium">Initial Advance</div>
                                            <div className="text-xs text-gray-500">Registered Payment</div>
                                        </div>
                                        <div className="font-bold text-green-700">₹{details.advancePaid.toLocaleString()}</div>
                                    </div>
                                )}
                                {details.payments.map(pay => (
                                    <div key={pay.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                        <div>
                                            <div className="font-medium">{pay.paymentMethod}</div>
                                            <div className="text-xs text-gray-500">
                                                {new Date(pay.paymentDate).toLocaleDateString()}
                                                {pay.referenceNumber && ` • ${pay.referenceNumber}`}
                                            </div>
                                        </div>
                                        <div className="font-bold text-green-700">₹{pay.amount.toLocaleString()}</div>
                                    </div>
                                ))}
                                {details.payments.length === 0 && details.advancePaid === 0 && (
                                    <p className="text-sm text-gray-400">No payments recorded</p>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
