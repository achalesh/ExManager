'use client';

import { useState } from 'react';
import { SpaceAllocationGrid } from '@/components/SpaceAllocationGrid';
import { InteractiveMap } from '@/components/InteractiveMap';
import { Button } from '@/components/ui/button';
import { MapPin, Grid, Map as MapIcon, List, Printer } from 'lucide-react';

interface SpaceAllocationViewProps {
    allSpaces: any[];
    bookings: any[];
    exhibitors: any[];
    eventId: number;
    eventName: string;
}

export function SpaceAllocationView({ allSpaces, bookings, exhibitors, eventId, eventName }: SpaceAllocationViewProps) {
    const [viewMode, setViewMode] = useState<'map' | 'grid'>('map');

    const availableSpaces = allSpaces.filter(s => s.status === 'Available');
    const totalRevenue = bookings.reduce((sum, b) => sum + b.totalAmount, 0);

    return (
        <div>
            <div className="flex flex-col md:flex-row md:items-center justify-between mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 mb-2">
                        Space Allocation
                    </h1>
                    <p className="text-gray-600">
                        Allocate spaces to exhibitors for {eventName}
                    </p>
                </div>
                <div className="flex items-center gap-2 mt-4 md:mt-0 bg-gray-100 p-1 rounded-lg print:hidden">
                    <Button
                        variant={viewMode === 'map' ? 'secondary' : 'ghost'}
                        className={viewMode === 'map' ? 'bg-white shadow-sm' : 'text-gray-500 hover:text-gray-900'}
                        size="sm"
                        onClick={() => setViewMode('map')}
                    >
                        <MapIcon className="h-4 w-4 mr-2" />
                        Map View
                    </Button>
                    <Button
                        variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
                        className={viewMode === 'grid' ? 'bg-white shadow-sm' : 'text-gray-500 hover:text-gray-900'}
                        size="sm"
                        onClick={() => setViewMode('grid')}
                    >
                        <Grid className="h-4 w-4 mr-2" />
                        List View
                    </Button>
                    <Button
                        variant="ghost"
                        size="sm"
                        className="text-gray-500 hover:text-gray-900"
                        onClick={() => window.print()}
                    >
                        <Printer className="h-4 w-4 mr-2" />
                        Print
                    </Button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8 print:hidden">
                <div className="bg-white rounded-lg shadow-sm p-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-gray-600">Available Spaces</p>
                            <p className="text-3xl font-bold text-green-600 mt-2">
                                {availableSpaces.length}
                            </p>
                        </div>
                        <div className="bg-green-100 rounded-lg p-3">
                            <MapPin className="h-6 w-6 text-green-600" />
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-lg shadow-sm p-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-gray-600">Booked Spaces</p>
                            <p className="text-3xl font-bold text-blue-600 mt-2">
                                {bookings.length}
                            </p>
                        </div>
                        <div className="bg-blue-100 rounded-lg p-3">
                            <MapPin className="h-6 w-6 text-blue-600" />
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-lg shadow-sm p-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-gray-600">Total Revenue</p>
                            <p className="text-3xl font-bold text-purple-600 mt-2">
                                ₹{totalRevenue.toFixed(2)}
                            </p>
                        </div>
                        <div className="bg-purple-100 rounded-lg p-3">
                            <MapPin className="h-6 w-6 text-purple-600" />
                        </div>
                    </div>
                </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm border min-h-[500px] p-1">
                {viewMode === 'map' ? (
                    <div className="p-4">
                        <InteractiveMap
                            spaces={allSpaces}
                            exhibitors={exhibitors}
                            eventId={eventId}
                        />
                    </div>
                ) : (
                    <div className="p-4">
                        <SpaceAllocationGrid
                            availableSpaces={availableSpaces}
                            bookings={bookings}
                            exhibitors={exhibitors}
                            eventId={eventId}
                        />
                    </div>
                )}
            </div>
        </div>
    );
}
