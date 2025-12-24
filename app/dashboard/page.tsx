import { redirect } from 'next/navigation';
import { getSession, setActiveEvent } from '@/lib/auth';
import { getEvents } from '@/app/actions';
import { getEventReport } from '@/app/report-actions';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Calendar, MapPin, Users, IndianRupee, Package, Zap } from 'lucide-react';

export default async function DashboardPage() {
    const session = await getSession();

    if (!session) {
        redirect('/login');
    }

    // If no active event, show event selection
    if (!session.activeEventId) {
        const events = await getEvents();
        const ongoingEvents = events.filter(e => e.status === 'Ongoing');
        const upcomingEvents = events.filter(e => e.status === 'Upcoming');

        return (
            <div className="max-w-4xl mx-auto">
                <div className="bg-white rounded-lg shadow-sm p-8">
                    <h1 className="text-3xl font-bold text-gray-900 mb-2">
                        Welcome, {session.name}!
                    </h1>
                    <p className="text-gray-600 mb-8">
                        Select an event to start managing or create a new one.
                    </p>

                    {ongoingEvents.length > 0 && (
                        <div className="mb-8">
                            <h2 className="text-xl font-semibold text-gray-900 mb-4">Ongoing Events</h2>
                            <div className="grid gap-4">
                                {ongoingEvents.map((event) => (
                                    <EventCard key={event.id} event={event} />
                                ))}
                            </div>
                        </div>
                    )}

                    {upcomingEvents.length > 0 && (
                        <div className="mb-8">
                            <h2 className="text-xl font-semibold text-gray-900 mb-4">Upcoming Events</h2>
                            <div className="grid gap-4">
                                {upcomingEvents.map((event) => (
                                    <EventCard key={event.id} event={event} />
                                ))}
                            </div>
                        </div>
                    )}

                    {events.length === 0 && (
                        <div className="text-center py-12">
                            <Calendar className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                            <h3 className="text-lg font-medium text-gray-900 mb-2">No events yet</h3>
                            <p className="text-gray-600 mb-6">Create your first event to get started</p>
                        </div>
                    )}
                </div>
            </div>
        );
    }

    // Get real statistics for active event
    const eventReport = await getEventReport(session.activeEventId);
    const stats: any = eventReport?.statistics || {
        totalSpaces: 0,
        bookedSpaces: 0,
        totalExhibitors: 0,
        totalRevenue: 0,
        occupancyRate: 0,
        totalMaterialAllocations: 0,
        totalElectricalAllocations: 0,
        totalWattage: 0,
    };

    // Show dashboard for active event
    return (
        <div>
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-gray-900 mb-2">
                    Dashboard
                </h1>
                <p className="text-gray-600">
                    Managing: {session.activeEventName}
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <StatCard
                    title="Total Spaces"
                    value={stats.totalSpaces.toString()}
                    icon={MapPin}
                    color="blue"
                    subtitle={`${stats.bookedSpaces} booked`}
                />
                <StatCard
                    title="Occupancy Rate"
                    value={`${stats.occupancyRate}%`}
                    icon={MapPin}
                    color="green"
                    subtitle={`${stats.bookedSpaces}/${stats.totalSpaces}`}
                />
                <StatCard
                    title="Exhibitors"
                    value={stats.totalExhibitors.toString()}
                    icon={Users}
                    color="purple"
                    subtitle="Registered"
                />
                <StatCard
                    title="Total Revenue"
                    value={`₹${stats.totalRevenue.toFixed(0)}`}
                    icon={IndianRupee}
                    color="green"
                    subtitle="All allocations"
                />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white rounded-lg shadow-sm p-6">
                    <h2 className="text-xl font-semibold text-gray-900 mb-4">Quick Actions</h2>
                    <div className="space-y-3">
                        <Link href="/dashboard/register-exhibitor">
                            <Button variant="outline" className="w-full justify-start">
                                <Users className="h-4 w-4 mr-2" />
                                Register New Exhibitor
                            </Button>
                        </Link>
                        <Link href="/dashboard/allocate-space">
                            <Button variant="outline" className="w-full justify-start">
                                <MapPin className="h-4 w-4 mr-2" />
                                Allocate Space
                            </Button>
                        </Link>
                        <Link href="/dashboard/allocate-material">
                            <Button variant="outline" className="w-full justify-start">
                                <Package className="h-4 w-4 mr-2" />
                                Allocate Materials
                            </Button>
                        </Link>
                        <Link href="/dashboard/reports">
                            <Button variant="outline" className="w-full justify-start">
                                <Zap className="h-4 w-4 mr-2" />
                                View Reports
                            </Button>
                        </Link>
                    </div>
                </div>

                <div className="bg-white rounded-lg shadow-sm p-6">
                    <h2 className="text-xl font-semibold text-gray-900 mb-4">Event Statistics</h2>
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <span className="text-sm text-gray-600">Available Spaces</span>
                            <span className="text-lg font-semibold text-green-600">
                                {stats.totalSpaces - stats.bookedSpaces}
                            </span>
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="text-sm text-gray-600">Material Allocations</span>
                            <span className="text-lg font-semibold text-blue-600">
                                {stats.totalMaterialAllocations || 0}
                            </span>
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="text-sm text-gray-600">Electrical Allocations</span>
                            <span className="text-lg font-semibold text-yellow-600">
                                {stats.totalElectricalAllocations || 0}
                            </span>
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="text-sm text-gray-600">Total Wattage</span>
                            <span className="text-lg font-semibold text-orange-600">
                                {stats.totalWattage || 0}W
                            </span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

function EventCard({ event }: { event: any }) {
    return (
        <form action={async () => {
            'use server';
            await setActiveEvent(event.id);
            redirect('/dashboard');
        }}>
            <button
                type="submit"
                className="w-full text-left bg-white border border-gray-200 rounded-lg p-4 hover:border-indigo-500 hover:shadow-md transition-all"
            >
                <div className="flex items-start justify-between">
                    <div>
                        <h3 className="font-semibold text-gray-900">{event.name}</h3>
                        <p className="text-sm text-gray-600 mt-1">
                            <MapPin className="h-4 w-4 inline mr-1" />
                            {event.location}
                        </p>
                        <p className="text-sm text-gray-500 mt-1">
                            {new Date(event.startDate).toLocaleDateString()} - {new Date(event.endDate).toLocaleDateString()}
                        </p>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${event.status === 'Ongoing'
                        ? 'bg-green-100 text-green-800'
                        : 'bg-blue-100 text-blue-800'
                        }`}>
                        {event.status}
                    </span>
                </div>
            </button>
        </form>
    );
}

function StatCard({ title, value, icon: Icon, color, subtitle }: any) {
    const colorClasses = {
        blue: 'bg-blue-100 text-blue-600',
        green: 'bg-green-100 text-green-600',
        purple: 'bg-purple-100 text-purple-600',
    };

    return (
        <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between">
                <div>
                    <p className="text-sm font-medium text-gray-600">{title}</p>
                    <p className="text-3xl font-bold text-gray-900 mt-2">{value}</p>
                    {subtitle && <p className="text-sm text-gray-500 mt-1">{subtitle}</p>}
                </div>
                <div className={`p-3 rounded-lg ${colorClasses[color as keyof typeof colorClasses]}`}>
                    <Icon className="h-6 w-6" />
                </div>
            </div>
        </div>
    );
}



