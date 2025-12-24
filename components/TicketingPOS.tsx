'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { createTicketSale } from '@/app/ticketing-actions';
import { ShoppingCart, Ticket, Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';


interface TicketType {
    id: number;
    name: string;
    category: string;
    price: number;
    batches: {
        id: number;
        startNumber: number;
        endNumber: number;
        currentNumber: number;
    }[];
}

export function TicketingPOS({ ticketTypes, eventId }: { ticketTypes: TicketType[], eventId: number }) {
    const [cart, setCart] = useState<{ typeId: number, name: string, price: number, quantity: number }[]>([]);
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    const addToCart = (ticket: TicketType) => {
        setCart(prev => {
            const existing = prev.find(item => item.typeId === ticket.id);
            if (existing) {
                return prev.map(item =>
                    item.typeId === ticket.id
                        ? { ...item, quantity: item.quantity + 1 }
                        : item
                );
            }
            return [...prev, { typeId: ticket.id, name: ticket.name, price: ticket.price, quantity: 1 }];
        });
    };

    const removeFromCart = (typeId: number) => {
        setCart(prev => prev.filter(item => item.typeId !== typeId));
    };

    const totalAmount = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);

    const handleCheckout = async () => {
        if (cart.length === 0) return;
        setLoading(true);

        const saleData = {
            eventId,
            items: cart.map(item => ({
                ticketTypeId: item.typeId,
                quantity: item.quantity
            }))
        };

        const result = await createTicketSale(saleData);

        if (result.success) {
            // Show success receipt or modal here usually
            alert(`Sale Successful! Total: ₹ ${totalAmount}`); // Simple alert for MVP, can upgrade to shadcn toast/dialog
            setCart([]);
            router.refresh();
        } else {
            alert(`Error: ${result.error}`);
        }
        setLoading(false);
    };

    return (
        <div className="flex flex-col lg:flex-row gap-6 h-[calc(100vh-100px)]">
            {/* Ticket Selection Area */}
            <div className="flex-1 overflow-y-auto">
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {ticketTypes.map(ticket => {
                        const activeBatch = ticket.batches[0];
                        const hasStock = activeBatch && activeBatch.currentNumber <= activeBatch.endNumber;

                        return (
                            <button
                                key={ticket.id}
                                onClick={() => hasStock && addToCart(ticket)}
                                disabled={!hasStock}
                                className={`
                                    flex flex-col items-center justify-center p-6 rounded-xl border-2 transition-all
                                    ${hasStock
                                        ? 'bg-white border-gray-200 hover:border-indigo-500 hover:shadow-md cursor-pointer'
                                        : 'bg-gray-50 border-gray-200 opacity-60 cursor-not-allowed'}
                                `}
                            >
                                <div className={`p-3 rounded-full mb-3 ${ticket.category === 'Entrance' ? 'bg-blue-100 text-blue-600' : 'bg-purple-100 text-purple-600'}`}>
                                    <Ticket className="h-6 w-6" />
                                </div>
                                <h3 className="font-semibold text-gray-900 text-center">{ticket.name}</h3>
                                <p className="text-lg font-bold text-gray-900 mt-1">₹ {ticket.price}</p>

                                <div className="mt-3 text-xs font-mono bg-gray-100 px-2 py-1 rounded">
                                    {hasStock ? (
                                        <span className="text-green-600">Next: #{activeBatch.currentNumber}</span>
                                    ) : (
                                        <span className="text-red-500">Out of Stock</span>
                                    )}
                                </div>
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Cart / Checkout Sidebar */}
            <div className="w-full lg:w-96 bg-white rounded-xl shadow-lg border border-gray-200 flex flex-col">
                <div className="p-4 border-b border-gray-100 bg-gray-50 rounded-t-xl">
                    <h2 className="font-semibold text-gray-900 flex items-center">
                        <ShoppingCart className="h-5 w-5 mr-2" />
                        Current Sale
                    </h2>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                    {cart.length === 0 ? (
                        <div className="text-center text-gray-400 py-12">
                            Cart is empty
                        </div>
                    ) : (
                        cart.map((item) => (
                            <div key={item.typeId} className="flex items-center justify-between bg-gray-50 p-3 rounded-lg">
                                <div>
                                    <div className="font-medium text-gray-900">{item.name}</div>
                                    <div className="text-sm text-gray-500">₹ {item.price} x {item.quantity}</div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <div className="font-bold text-gray-900">
                                        ₹ {item.price * item.quantity}
                                    </div>
                                    <button
                                        onClick={() => removeFromCart(item.typeId)}
                                        className="text-red-500 hover:text-red-700 p-1"
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </button>
                                </div>
                            </div>
                        ))
                    )}
                </div>

                <div className="p-6 border-t border-gray-100 bg-gray-50 rounded-b-xl">
                    <div className="flex justify-between items-center mb-6">
                        <span className="text-gray-600">Total Amount</span>
                        <span className="text-3xl font-bold text-gray-900">₹ {totalAmount}</span>
                    </div>
                    <Button
                        size="lg"
                        className="w-full text-lg h-12"
                        onClick={handleCheckout}
                        disabled={cart.length === 0 || loading}
                    >
                        {loading ? 'Processing...' : 'Complete Sale (Cash)'}
                    </Button>
                </div>
            </div>
        </div>
    );
}
