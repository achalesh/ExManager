import Link from 'next/link';
import { RegisterExhibitorDialog } from '@/components/RegisterExhibitorDialog';

export function NavBar() {
    return (
        <nav className="border-b bg-background">
            <div className="container mx-auto px-4 h-16 flex items-center justify-between max-w-5xl">
                <Link href="/" className="font-bold text-xl tracking-tight">
                    ExManager
                </Link>
                <div className="flex items-center gap-4">
                    <RegisterExhibitorDialog />
                </div>
            </div>
        </nav>
    );
}
