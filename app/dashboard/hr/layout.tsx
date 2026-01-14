import { ReactNode } from 'react';
import Link from 'next/link';
import { Users, Clock, Receipt, Banknote } from 'lucide-react';

export default function HRLayout({ children }: { children: ReactNode }) {
    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-gray-200 pb-4">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Human Resources</h1>
                    <p className="text-gray-600">Manage employees, attendance, and payroll</p>
                </div>
                <div className="flex gap-2">
                    <Link
                        href="/dashboard/hr/employees"
                        className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 bg-white hover:text-indigo-600 transition-colors"
                    >
                        <Users className="w-4 h-4" /> Employees
                    </Link>
                    <Link
                        href="/dashboard/hr/attendance"
                        className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 bg-white hover:text-indigo-600 transition-colors"
                    >
                        <Clock className="w-4 h-4" /> Attendance
                    </Link>
                    <Link
                        href="/dashboard/hr/payroll"
                        className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 bg-white hover:text-indigo-600 transition-colors"
                    >
                        <Banknote className="w-4 h-4" /> Payroll
                    </Link>
                </div>
            </div>
            <div>{children}</div>
        </div>
    );
}
