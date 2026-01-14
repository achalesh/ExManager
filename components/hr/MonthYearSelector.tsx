'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

interface MonthYearSelectorProps {
    month: number;
    year: number;
}

export function MonthYearSelector({ month, year }: MonthYearSelectorProps) {
    const router = useRouter();
    const searchParams = useSearchParams();

    const handleMonthChange = (value: string) => {
        const params = new URLSearchParams(searchParams.toString());
        params.set('month', value);
        router.push(`?${params.toString()}`);
    };

    const handleYearChange = (value: string) => {
        const params = new URLSearchParams(searchParams.toString());
        params.set('year', value);
        router.push(`?${params.toString()}`);
    };

    const months = [
        { value: 1, label: 'January' },
        { value: 2, label: 'February' },
        { value: 3, label: 'March' },
        { value: 4, label: 'April' },
        { value: 5, label: 'May' },
        { value: 6, label: 'June' },
        { value: 7, label: 'July' },
        { value: 8, label: 'August' },
        { value: 9, label: 'September' },
        { value: 10, label: 'October' },
        { value: 11, label: 'November' },
        { value: 12, label: 'December' },
    ];

    const currentYear = new Date().getFullYear();
    const years = Array.from({ length: 5 }, (_, i) => currentYear - 2 + i); // 2 years back, 2 years forward

    return (
        <div className="flex gap-2">
            <Select value={month.toString()} onValueChange={handleMonthChange}>
                <SelectTrigger className="w-[140px]">
                    <SelectValue placeholder="Month" />
                </SelectTrigger>
                <SelectContent>
                    {months.map((m) => (
                        <SelectItem key={m.value} value={m.value.toString()}>
                            {m.label}
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>

            <Select value={year.toString()} onValueChange={handleYearChange}>
                <SelectTrigger className="w-[100px]">
                    <SelectValue placeholder="Year" />
                </SelectTrigger>
                <SelectContent>
                    {years.map((y) => (
                        <SelectItem key={y} value={y.toString()}>
                            {y}
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>
        </div>
    );
}
