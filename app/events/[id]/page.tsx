import { getEvent, getCategories } from '@/app/actions';
import { NewSpaceDialog } from '@/components/dialogs/NewSpaceDialog';
import { NewCategoryDialog } from '@/components/dialogs/NewCategoryDialog';
import { BookingDialog } from '@/components/dialogs/BookingDialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { CalendarIcon, MapPin, LayoutGrid, ArrowLeft } from 'lucide-react';
import { format } from 'date-fns';
import Link from 'next/link';
import { notFound } from 'next/navigation';

export default async function EventPage(props: { params: Promise<{ id: string }> }) {
    const params = await props.params;
    const eventId = Number(params.id);
    if (isNaN(eventId)) return notFound();

    const [event, categories] = await Promise.all([
        getEvent(eventId),
        getCategories()
    ]);

    if (!event) return notFound();

    return (
        <div className="container mx-auto p-4 sm:p-6 max-w-5xl">
            <div className="mb-6">
                <Link href="/" className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1 mb-4">
                    <ArrowLeft className="h-4 w-4" /> Back to Dashboard
                </Link>
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">{event.name}</h1>
                        <div className="flex items-center gap-4 text-muted-foreground mt-2">
                            <span className="flex items-center gap-1"><MapPin className="h-4 w-4" /> {event.location}</span>
                            <span className="flex items-center gap-1"><CalendarIcon className="h-4 w-4" /> {format(event.startDate, 'MMM d, yyyy')}</span>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <NewCategoryDialog />
                        <NewSpaceDialog eventId={event.id} categories={categories} />
                    </div>
                </div>
            </div>

            <Separator className="my-6" />

            <div className="grid gap-6 md:grid-cols-3">
                {/* Main Content: Spaces List */}
                <div className="md:col-span-2 space-y-6">
                    <div className="flex items-center justify-between">
                        <h2 className="text-xl font-semibold">Spaces ({event.spaces.length})</h2>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">

                        {/* ... inside map ... */}
                        {event.spaces.map((space) => (
                            <BookingDialog key={space.id} space={space} eventId={event.id} />
                        ))}
                        {event.spaces.length === 0 && (
                            <div className="col-span-full py-12 text-center text-muted-foreground border-2 border-dashed rounded-lg bg-muted/10">
                                <LayoutGrid className="h-10 w-10 mx-auto mb-3 opacity-20" />
                                <p>No spaces allocated yet.</p>
                                <p className="text-sm">Add spaces to start booking.</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Sidebar: Summary & Stats */}
                <div className="space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Overview</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex justify-between text-sm">
                                <span className="text-muted-foreground">Total Spaces</span>
                                <span className="font-medium">{event.spaces.length}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-muted-foreground">Available</span>
                                <span className="font-medium text-green-600">
                                    {event.spaces.filter(s => s.status === 'Available').length}
                                </span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-muted-foreground">Booked</span>
                                <span className="font-medium text-blue-600">
                                    {event.spaces.filter(s => s.status === 'Booked').length}
                                </span>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
