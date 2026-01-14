import { getSession } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { format } from 'date-fns';
import { getWeeklyAttendance } from '@/app/actions/hr/attendance';
import { WeeklyAttendanceTable } from '@/components/hr/WeeklyAttendanceTable';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import Link from 'next/link';

export default async function AttendancePage({ searchParams }: { searchParams: { date?: string } }) {
    const session = await getSession();
    if (!session || !['Admin', 'Manager', 'Accountant'].includes(session.roleName)) {
        redirect('/dashboard');
    }

    const today = new Date();
    const queryDateStr = (await searchParams).date || format(today, 'yyyy-MM-dd');
    const queryDate = new Date(queryDateStr);

    // Calculate Start of Week (Monday) based on query date
    const day = queryDate.getDay();
    const diff = queryDate.getDate() - day + (day === 0 ? -6 : 1); // adjust when day is sunday
    const monday = new Date(queryDate.setDate(diff));
    monday.setHours(0, 0, 0, 0);

    const weekDates = [];
    for (let i = 0; i < 7; i++) {
        const d = new Date(monday);
        d.setDate(monday.getDate() + i);
        weekDates.push(d);
    }

    const startDateStr = format(weekDates[0], 'yyyy-MM-dd');
    const endDateStr = format(weekDates[6], 'yyyy-MM-dd');

    const employees = await getWeeklyAttendance(session.activeEventId!, startDateStr, endDateStr);

    // Navigation Helpers
    const prevWeek = new Date(monday);
    prevWeek.setDate(monday.getDate() - 7);
    const nextWeek = new Date(monday);
    nextWeek.setDate(monday.getDate() + 7);

    return (
        <div className="max-w-[1600px] mx-auto space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900">Attendance Sheet</h2>
                    <p className="text-sm text-gray-500">Manage attendance for the week of {monday.toLocaleDateString()}</p>
                </div>

                <div className="flex items-center gap-2 bg-white p-1 rounded-md border shadow-sm">
                    <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
                        <Link href={`?date=${format(prevWeek, 'yyyy-MM-dd')}`}>
                            <ChevronLeft className="h-4 w-4" />
                        </Link>
                    </Button>

                    <form className="flex items-center gap-2 px-2">
                        <Input
                            type="date"
                            name="date"
                            defaultValue={format(monday, 'yyyy-MM-dd')}
                            className="h-8 w-auto border-0 p-0 text-sm font-medium focus-visible:ring-0"
                        />
                    </form>

                    <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
                        <Link href={`?date=${format(nextWeek, 'yyyy-MM-dd')}`}>
                            <ChevronRight className="h-4 w-4" />
                        </Link>
                    </Button>
                </div>
            </div>

            <WeeklyAttendanceTable
                staffList={employees}
                startDate={monday}
                weekDates={weekDates}
                eventId={session.activeEventId!}
            />
        </div>
    );
}
