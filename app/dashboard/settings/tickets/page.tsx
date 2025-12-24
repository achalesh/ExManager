import { getSession } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { getTicketTypes } from '@/app/ticketing-actions';
import { getInventory } from '@/app/inventory-actions';
import { CreateTicketTypeDialog } from '@/components/CreateTicketTypeDialog';
import { AddBatchDialog } from '@/components/AddBatchDialog';
import { DeleteBatchButton } from '@/components/DeleteBatchButton';
import { Badge } from '@/components/ui/badge';

export default async function TicketSettingsPage() {
    const session = await getSession();

    if (!session || !['Admin', 'Manager'].includes(session.roleName)) {
        redirect('/dashboard');
    }

    if (!session.activeEventId) {
        return <div className="p-8 text-center text-gray-500">Please select an event first.</div>;
    }

    // ... inside function ...
    const ticketTypes = await getTicketTypes(session.activeEventId);
    const inventory = await getInventory(session.activeEventId); // Fetch inventory

    return (
        <div className="max-w-5xl mx-auto">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 mb-2">Ticket Configuration</h1>
                    <p className="text-gray-600">Manage ticket types and stock series for {session.activeEventName}</p>
                </div>
                <CreateTicketTypeDialog eventId={session.activeEventId} />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-6">
                {ticketTypes.map((ticket) => {
                    const activeBatch = ticket.batches[0]; // Latest active batch

                    return (
                        <div key={ticket.id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 flex flex-col justify-between h-full hover:shadow-md transition-shadow">
                            <div>
                                <div className="flex items-center justify-between mb-4">
                                    <Badge variant={ticket.category === 'Entrance' ? 'default' : 'secondary'}>
                                        {ticket.category}
                                    </Badge>
                                    <div className="text-xl font-bold text-gray-900">
                                        Rs. {ticket.price}
                                    </div>
                                </div>

                                <h3 className="text-lg font-bold text-gray-900 mb-4">{ticket.name}</h3>

                                <div className="space-y-4">
                                    {activeBatch ? (
                                        <div className="bg-gray-50 p-3 rounded-md border border-gray-100">
                                            <div className="text-xs text-gray-500 uppercase font-semibold mb-1">Active Series</div>
                                            <div className="font-mono text-sm mb-2">{activeBatch.startNumber} - {activeBatch.endNumber}</div>

                                            <div className="flex justify-between items-end">
                                                <div>
                                                    <div className="text-xs text-gray-500">Next Ticket</div>
                                                    <div className="text-green-600 font-bold">#{activeBatch.currentNumber}</div>
                                                </div>
                                                <div className="text-right">
                                                    <div className="text-xs text-gray-500">Remaining</div>
                                                    <div className="font-medium">{activeBatch.endNumber - activeBatch.currentNumber + 1}</div>
                                                </div>
                                            </div>
                                            <div className="mt-2 flex justify-end">
                                                <DeleteBatchButton id={activeBatch.id} />
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="bg-red-50 p-4 rounded-md border border-red-100 text-center">
                                            <div className="text-sm text-red-600 font-medium">No active stock</div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="pt-6 mt-4 border-t border-gray-100">
                                <AddBatchDialog
                                    ticketTypeId={ticket.id}
                                    ticketName={ticket.name}
                                    inventoryOptions={inventory}
                                />
                            </div>
                        </div>
                    );
                })}

                {ticketTypes.length === 0 && (
                    <div className="col-span-full text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-200">
                        <p className="text-gray-500">No ticket types defined yet.</p>
                        <p className="text-sm text-gray-400">Click "Add Ticket Type" to get started.</p>
                    </div>
                )}
            </div>
        </div>
    );
}
