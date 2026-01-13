import { ReactNode } from 'react';
import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';
import { DashboardNav } from '@/components/layout/DashboardNav';
import { Footer } from '@/components/layout/Footer';

export default async function DashboardLayout({
    children,
}: {
    children: ReactNode;
}) {
    const session = await getSession();

    if (!session) {
        redirect('/login');
    }

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col">
            <DashboardNav session={session} />
            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-grow w-full">
                {children}
            </main>
            <Footer />
        </div>
    );
}
