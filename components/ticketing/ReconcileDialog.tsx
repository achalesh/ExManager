'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { reconcileAssignment } from '@/app/staff-ticketing-actions';
import { useRouter } from 'next/navigation';
import { CheckCircle2 } from 'lucide-react';

interface Props {
    assignment: any;
}

export function ReconcileDialog({ assignment }: Props) {
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [returnStartNumber, setReturnStartNumber] = useState<string>('');
    const [allSold, setAllSold] = useState(false);
    const [cashInput, setCashInput] = useState(0);
    const [upiInput, setUpiInput] = useState(0);
    const router = useRouter();

    // Calculations
    const startNum = parseInt(returnStartNumber) || (assignment.endNumber + 1);

    // Logic: 
    const safeStartNum = Math.max(assignment.startNumber, Math.min(startNum, assignment.endNumber + 1));

    let returnedCount = 0;
    if (allSold) {
        returnedCount = 0;
    } else if (returnStartNumber) {
        if (startNum > assignment.endNumber) {
            returnedCount = 0;
        } else {
            returnedCount = assignment.endNumber - safeStartNum + 1;
        }
    }

    // Ensure accurate bounds just in case logic slips
    const soldCount = assignment.assignedCount - returnedCount;
    const totalAmount = soldCount * assignment.ticketType.price;
    const totalReceived = cashInput + upiInput;
    const difference = totalReceived - totalAmount;

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setLoading(true);

        const formData = new FormData(e.currentTarget);
        // Include assignment ID
        formData.append('assignmentId', assignment.id.toString());
        // Append calculated returned count
        formData.append('returnedCount', returnedCount.toString());

        const result = await reconcileAssignment(formData);

        if (result.success) {
            setOpen(false);
            router.refresh();
        } else {
            alert(result.error);
        }
        setLoading(false);
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="text-blue-600 hover:text-blue-700">
                    <CheckCircle2 className="w-4 h-4 mr-1" /> Reconcile
                </Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Return Stock & Cash</DialogTitle>
                </DialogHeader>
                <div className="bg-gray-50 p-3 rounded-md text-sm text-gray-700 mb-4">
                    <p><strong>Staff:</strong> {assignment.staff.name}</p>
                    <p><strong>Series:</strong> {assignment.seriesLabel} ({assignment.startNumber} - {assignment.endNumber})</p>
                    <p><strong>Assigned:</strong> {assignment.assignedCount} tickets</p>
                    <p><strong>Price:</strong> ₹{assignment.ticketType.price} / ticket</p>
                </div>
                <form onSubmit={handleSubmit} className="space-y-4">

                    <div className="flex items-center space-x-2 pb-2">
                        <input
                            type="checkbox"
                            id="allSold"
                            className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                            checked={allSold}
                            onChange={(e) => setAllSold(e.target.checked)}
                        />
                        <Label htmlFor="allSold" className="font-medium cursor-pointer">
                            All Tickets Sold (0 Returns)
                        </Label>
                    </div>

                    {!allSold && (
                        <div className="space-y-2">
                            <Label htmlFor="returnStartNumber">Start Number of Return Ticket</Label>
                            <Input
                                id="returnStartNumber"
                                type="number"
                                min={assignment.startNumber}
                                max={assignment.endNumber + 1}
                                placeholder="e.g. 1050"
                                value={returnStartNumber}
                                onChange={(e) => setReturnStartNumber(e.target.value)}
                                required={!allSold}
                            />
                            <p className="text-xs text-gray-500">
                                Enter the serial number of the first unused ticket.
                            </p>
                        </div>
                    )}


                    <div className="grid grid-cols-3 gap-4 bg-gray-100 p-3 rounded-md text-center">
                        <div>
                            <div className="text-xs text-gray-500 uppercase">Returned</div>
                            <div className="font-bold text-gray-900">{returnedCount}</div>
                        </div>
                        <div>
                            <div className="text-xs text-gray-500 uppercase">Sold</div>
                            <div className="font-bold text-green-600">{soldCount}</div>
                        </div>
                        <div>
                            <div className="text-xs text-gray-500 uppercase">Amount</div>
                            <div className="font-bold text-blue-600">₹{totalAmount}</div>
                        </div>
                    </div>




                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="cashReceived">Cash Handed Over (₹)</Label>
                            <Input
                                id="cashReceived"
                                name="cashReceived"
                                type="number"
                                min="0"
                                step="0.01"
                                required
                                placeholder="Total cash"
                                defaultValue="0"
                                onChange={(e) => setCashInput(Number(e.target.value) || 0)}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="upiReceived">UPI / Online (₹)</Label>
                            <Input
                                id="upiReceived"
                                name="upiReceived"
                                type="number"
                                min="0"
                                step="0.01"
                                placeholder="Total online"
                                defaultValue="0"
                                onChange={(e) => setUpiInput(Number(e.target.value) || 0)}
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 bg-blue-50 p-3 rounded-md">
                        <div>
                            <div className="text-xs text-blue-700 uppercase font-semibold">Total Received</div>
                            <div className="text-xl font-bold text-blue-900">₹{totalReceived}</div>
                        </div>
                        <div className="text-right">
                            <div className="text-xs text-gray-500 uppercase">Difference</div>
                            <div className={`text-lg font-bold ${difference < 0 ? 'text-red-600' : difference > 0 ? 'text-green-600' : 'text-gray-900'}`}>
                                {difference > 0 ? '+' : ''}{difference}
                            </div>
                        </div>
                    </div>


                    <div className="space-y-2">
                        <Label htmlFor="remarks">Remarks (Optional)</Label>
                        <Textarea
                            id="remarks"
                            name="remarks"
                            placeholder="Notes on shortage/excess..."
                        />
                    </div>

                    <Button type="submit" className="w-full" disabled={loading}>
                        {loading ? 'Processing...' : 'Complete Reconciliation'}
                    </Button>
                </form>
            </DialogContent>
        </Dialog>
    );
}
