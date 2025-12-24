import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';
import { getEvents } from '@/app/actions';
import { CreateEventDialog } from '@/components/CreateEventDialog';
import { Calendar, MapPin, Users } from 'lucide-react';
import { setActiveEvent } from '@/lib/auth';

export default async function EventsPage() {
    const session = await getSession();

    if (!session) {
        redirect('/login');
    }

    if (session.roleName !== 'Admin' && session.roleName !== 'Manager') {
        redirect('/dashboard');
    }

    const events = await getEvents();
    const ongoingEvents = events.filter(e => e.status === 'Ongoing');
    const upcomingEvents = events.filter(e => e.status === 'Upcoming');
    const completedEvents = events.filter(e => e.status === 'Completed');

    return (
        <div>
            <div className="mb-8 flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 mb-2">
                        Event Management
                    </h1>
                    <p className="text-gray-600">
                        Create and manage your events
                    </p>
                </div>
                <CreateEventDialog />
            </div>

            {events.length === 0 ? (
                <div className="bg-white rounded-lg shadow-sm p-12 text-center">
                    <Calendar className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No events yet</h3>
                    <p className="text-gray-600 mb-6">
                        Create your first event to get started
                    </p>
                    <CreateEventDialog />
                </div>
            ) : (
                <div className="space-y-8">
                    {ongoingEvents.length > 0 && (
                        <div>
                            <h2 className="text-xl font-semibold text-gray-900 mb-4">
                                Ongoing Events ({ongoingEvents.length})
                            </h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {ongoingEvents.map((event) => (
                                    <EventCard key={event.id} event={event} isActive={event.id === session.activeEventId} />
                                ))}
                            </div>
                        </div>
                    )}

                    {upcomingEvents.length > 0 && (
                        <div>
                            <h2 className="text-xl font-semibold text-gray-900 mb-4">
                                Upcoming Events ({upcomingEvents.length})
                            </h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {upcomingEvents.map((event) => (
                                    <EventCard key={event.id} event={event} isActive={event.id === session.activeEventId} />
                                ))}
                            </div>
                        </div>
                    )}

                    {completedEvents.length > 0 && (
                        <div>
                            <h2 className="text-xl font-semibold text-gray-900 mb-4">
                                Completed Events ({completedEvents.length})
                            </h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {completedEvents.map((event) => (
                                    <EventCard key={event.id} event={event} isActive={event.id === session.activeEventId} />
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

function EventCard({ event, isActive }: { event: any; isActive: boolean }) {
    return (
        <div className={`bg-white rounded-lg shadow-sm p-6 border-2 transition-all ${isActive ? 'border-indigo-500 shadow-md' : 'border-transparent hover:border-gray-300'
            }`}>
            <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900 mb-1">
                        {event.name}
                    </h3>
                    {isActive && (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800">
                            Active
                        </span>
                    )}
                </div>
                <span className={`px-3 py-1 rounded-full text-xs font-medium ${event.status === 'Ongoing'
                        ? 'bg-green-100 text-green-800'
                        : event.status === 'Upcoming'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-gray-100 text-gray-800'
                    }`}>
                    {event.status}
                </span>
            </div>

            <div className="space-y-2 mb-4">
                <div className="flex items-center text-sm text-gray-600">
                    <MapPin className="h-4 w-4 mr-2" />
                    {event.location}
                </div>
                <div className="flex items-center text-sm text-gray-600">
                    <Calendar className="h-4 w-4 mr-2" />
                    {new Date(event.startDate).toLocaleDateString()} - {new Date(event.endDate).toLocaleDateString()}
                </div>
            </div>

            {!isActive && (
                <form action={async () => {
                    'use server';
                    await setActiveEvent(event.id);
                    redirect('/dashboard');
                }}>
                    <button
                        type="submit"
                        className="w-full px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm font-medium"
                    >
                        Set as Active Event
                    </button>
                </form>
            )}
        </div>
    );
}
