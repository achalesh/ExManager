import { getSession } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { getPaymentReport } from '@/app/report-actions';
import { PaymentReportTable } from '@/components/reports/PaymentReportTable';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

interface PageProps {
    searchParams: { [key: string]: string | string[] | undefined }
}

export default async function PaymentReportPage({ searchParams }: PageProps) {
    const session = await getSession();

    if (!session || !session.activeEventId) {
        redirect('/dashboard');
    }

    const page = Number(searchParams.page) || 1;
    const search = typeof searchParams.search === 'string' ? searchParams.search : '';
    const category = typeof searchParams.category === 'string' ? searchParams.category : 'All';
    const method = typeof searchParams.method === 'string' ? searchParams.method : 'All';
    const date = typeof searchParams.date === 'string' ? searchParams.date : '';

    const data = await getPaymentReport(session.activeEventId, {
        page,
        pageSize: 20,
        search,
        category,
        method,
        date
    });

    return (
        <div className="max-w-7xl mx-auto p-6">
            <div className="flex items-center gap-4 mb-8">
                <Link href="/dashboard/reports">
                    <Button variant="outline" size="icon">
                        <ArrowLeft className="h-4 w-4" />
                    </Button>
                </Link>
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Payment Collection Report</h1>
                    <p className="text-muted-foreground">
                        View and manage all payment records for {session.activeEventName}
                    </p>
                </div>
            </div>

            <PaymentReportTable
                data={data}
                role={session.roleName}
            />
        </div>
    );
}
