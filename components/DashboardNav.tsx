'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
    UserPlus,
    MapPin,
    Package,
    Zap,
    Home as HomeIcon,
    Settings,
    Shield,
    LogOut,
    ChevronDown,
    Menu,
    X,
    BarChart3,
    Ticket,
    Users,
    LayoutGrid,
    Briefcase,
    Receipt,
    IndianRupee
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { logout } from '@/lib/auth';
import { useRouter } from 'next/navigation';

interface DashboardNavProps {
    session: {
        name: string;
        roleName: string;
        activeEventName: string | null;
        activeEventAddress: string | null;
        activeEventLogo: string | null;
    };
}

export function DashboardNav({ session }: DashboardNavProps) {
    const pathname = usePathname();
    const router = useRouter();
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

    async function handleLogout() {
        await logout();
        router.push('/login');
        router.refresh();
    }

    const isAdmin = session.roleName === 'Admin';
    const isManager = session.roleName === 'Manager' || isAdmin;

    const allocationItems = [
        { href: '/dashboard/allocate-space', label: 'Allocate Space', icon: MapPin },
        { href: '/dashboard/allocate-material', label: 'Allocate Material', icon: Package },
        { href: '/dashboard/allocate-electric', label: 'Allocate Electric', icon: Zap },
        { href: '/dashboard/allocate-shed', label: 'Allocate Shed', icon: HomeIcon },
    ];

    const operationsItems = [
        { href: '/dashboard/register-exhibitor', label: 'Register Exhibitor', icon: UserPlus },
        { href: '/dashboard/exhibitors', label: 'Exhibitor List', icon: Users },
        { href: '/dashboard/payments', label: 'Payment Collection', icon: IndianRupee },
        { href: '/dashboard/accounts', label: 'Daily Accounts', icon: Receipt },
        { href: '/dashboard/staff', label: 'Event Staff', icon: Users },
    ];

    const ticketingItems = [
        { href: '/dashboard/ticketing', label: 'Ticket Counter', icon: Ticket, roles: ['Admin', 'Manager', 'Staff', 'Operations'] },
        { href: '/dashboard/ticketing/staff', label: 'Ticket Allocation', icon: Users, roles: ['Admin', 'Manager'] },
        { href: '/dashboard/reports/ticketing', label: 'Sales Overview', icon: BarChart3, roles: ['Admin', 'Manager', 'Staff'] },
        { href: '/dashboard/reports/sales', label: 'Sold Ticket Details', icon: Receipt, roles: ['Admin', 'Manager', 'Office', 'Accountant'] }, // Added this
        // Settings options - restricted to Manager/Admin
        { href: '/dashboard/settings/tickets', label: 'Configuration', icon: Settings, roles: ['Admin', 'Manager'] },
        { href: '/dashboard/settings/inventory', label: 'Stock Registry', icon: Package, roles: ['Admin', 'Manager'] },
    ];

    const reportItems = [
        { href: '/dashboard/reports', label: 'General Reports', icon: BarChart3 },
        { href: '/dashboard/reports/electrical', label: 'Electrical Reports', icon: Zap },
        { href: '/dashboard/reports/materials', label: 'Material Reports', icon: Package },
        { href: '/dashboard/reports/sheds', label: 'Shed Reports', icon: HomeIcon },
    ];

    const settingsItems = [
        { href: '/dashboard/settings/spaces', label: 'Space Categories' },
        { href: '/dashboard/settings/materials', label: 'Materials' },
        { href: '/dashboard/settings/electrical', label: 'Electrical Items' },
        { href: '/dashboard/settings/sheds', label: 'Sheds' },
    ];

    const adminItems = [
        { href: '/dashboard/admin/events', label: 'Manage Events' },
        { href: '/dashboard/admin/users', label: 'Create User' },
        { href: '/dashboard/admin/roles', label: 'Create Roles' },
    ];

    return (
        <nav className="bg-white border-b border-gray-200 sticky top-0 z-50 print:hidden">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between h-16">
                    <div className="flex items-center">
                        <Link href="/dashboard" className="flex items-center">
                            {session.activeEventName ? (
                                <div className="flex items-center gap-2">
                                    {session.activeEventLogo && (
                                        <img
                                            src={session.activeEventLogo}
                                            alt="Event Logo"
                                            className="h-10 w-10 object-contain"
                                        />
                                    )}
                                    <div className="flex flex-col">
                                        <span className="text-xl font-bold text-indigo-600 leading-tight">
                                            {session.activeEventName}
                                        </span>
                                        {session.activeEventAddress && (
                                            <span className="text-xs text-gray-500 font-medium">
                                                {session.activeEventAddress}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            ) : (
                                <span className="text-xl font-bold text-indigo-600">Event Manager</span>
                            )}
                        </Link>
                    </div>

                    {/* Desktop Navigation */}
                    <div className="hidden md:flex md:items-center md:space-x-2">

                        {/* Allocations Dropdown */}
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className={`flex items-center gap-1 ${allocationItems.some(i => pathname.startsWith(i.href)) ? 'bg-indigo-50 text-indigo-700' : ''}`}
                                    suppressHydrationWarning
                                >
                                    <LayoutGrid className="h-4 w-4" />
                                    <span>Allocations</span>
                                    <ChevronDown className="h-3 w-3" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                {allocationItems.map(item => (
                                    <DropdownMenuItem key={item.href} asChild>
                                        <Link href={item.href} className="flex items-center gap-2">
                                            <item.icon className="h-4 w-4" />
                                            {item.label}
                                        </Link>
                                    </DropdownMenuItem>
                                ))}
                            </DropdownMenuContent>
                        </DropdownMenu>

                        {/* Operations Dropdown */}
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className={`flex items-center gap-1 ${operationsItems.some(i => pathname.startsWith(i.href)) ? 'bg-indigo-50 text-indigo-700' : ''}`}
                                    suppressHydrationWarning
                                >
                                    <Briefcase className="h-4 w-4" />
                                    <span>Operations</span>
                                    <ChevronDown className="h-3 w-3" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                {operationsItems.map(item => (
                                    <DropdownMenuItem key={item.href} asChild>
                                        <Link href={item.href} className="flex items-center gap-2">
                                            <item.icon className="h-4 w-4" />
                                            {item.label}
                                        </Link>
                                    </DropdownMenuItem>
                                ))}
                            </DropdownMenuContent>
                        </DropdownMenu>

                        {/* Ticketing Dropdown */}
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className={`flex items-center gap-1 ${ticketingItems.some(i => pathname.startsWith(i.href)) ? 'bg-indigo-50 text-indigo-700' : ''}`}
                                    suppressHydrationWarning
                                >
                                    <Ticket className="h-4 w-4" />
                                    <span>Ticketing</span>
                                    <ChevronDown className="h-3 w-3" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                {ticketingItems.map(item => {
                                    // Basic Role check logic for menu items
                                    // If item requires Manager/Admin rights and user isn't one, skip
                                    const isRestricted = item.roles.every(r => ['Admin', 'Manager'].includes(r));
                                    if (isRestricted && !isManager) return null;

                                    return (
                                        <DropdownMenuItem key={item.href} asChild>
                                            <Link href={item.href} className="flex items-center gap-2">
                                                <item.icon className="h-4 w-4" />
                                                {item.label}
                                            </Link>
                                        </DropdownMenuItem>
                                    );
                                })}
                            </DropdownMenuContent>
                        </DropdownMenu>

                        {/* Reports Dropdown */}
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className={`flex items-center gap-1 ${reportItems.some(i => pathname.startsWith(i.href)) ? 'bg-indigo-50 text-indigo-700' : ''}`}
                                    suppressHydrationWarning
                                >
                                    <BarChart3 className="h-4 w-4" />
                                    <span>Reports</span>
                                    <ChevronDown className="h-3 w-3" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                {reportItems.map(item => (
                                    <DropdownMenuItem key={item.href} asChild>
                                        <Link href={item.href} className="flex items-center gap-2">
                                            {item.label}
                                        </Link>
                                    </DropdownMenuItem>
                                ))}
                            </DropdownMenuContent>
                        </DropdownMenu>

                        {/* Settings Dropdown */}
                        {isManager && (
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="sm" className="flex items-center gap-1" suppressHydrationWarning>
                                        <Settings className="h-4 w-4" />
                                        <span>Settings</span>
                                        <ChevronDown className="h-3 w-3" />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                    {settingsItems.map((item) => (
                                        <DropdownMenuItem key={item.href} asChild>
                                            <Link href={item.href}>{item.label}</Link>
                                        </DropdownMenuItem>
                                    ))}
                                </DropdownMenuContent>
                            </DropdownMenu>
                        )}

                        {/* Admin Dropdown */}
                        {isAdmin && (
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="sm" className="flex items-center gap-1" suppressHydrationWarning>
                                        <Shield className="h-4 w-4" />
                                        <span>Admin</span>
                                        <ChevronDown className="h-3 w-3" />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                    {adminItems.map((item) => (
                                        <DropdownMenuItem key={item.href} asChild>
                                            <Link href={item.href}>{item.label}</Link>
                                        </DropdownMenuItem>
                                    ))}
                                </DropdownMenuContent>
                            </DropdownMenu>
                        )}

                        <Button variant="ghost" size="icon" onClick={handleLogout} title="Logout">
                            <LogOut className="h-4 w-4" />
                        </Button>

                        <div className="ml-2 pl-2 border-l border-gray-200">
                            <div className="text-sm">
                                <div className="font-medium text-gray-900">{session.name.split(' ')[0]}</div>
                            </div>
                        </div>
                    </div>

                    {/* Mobile menu button */}
                    <div className="md:hidden flex items-center">
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                        >
                            {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
                        </Button>
                    </div>
                </div>
            </div>

            {/* Mobile Navigation */}
            {mobileMenuOpen && (
                <div className="md:hidden border-t border-gray-200 bg-white max-h-[80vh] overflow-y-auto">
                    <div className="px-2 pt-2 pb-3 space-y-1">

                        <div className="pt-2 pb-1 px-3 text-xs font-semibold text-gray-500 uppercase">Allocations</div>
                        {allocationItems.map(item => (
                            <Link
                                key={item.href}
                                href={item.href}
                                onClick={() => setMobileMenuOpen(false)}
                                className="flex items-center gap-2 px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:bg-gray-100"
                            >
                                <item.icon className="h-5 w-5" />
                                {item.label}
                            </Link>
                        ))}

                        <div className="pt-2 pb-1 px-3 text-xs font-semibold text-gray-500 uppercase mt-2">Operations</div>
                        {operationsItems.map(item => (
                            <Link
                                key={item.href}
                                href={item.href}
                                onClick={() => setMobileMenuOpen(false)}
                                className="flex items-center gap-2 px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:bg-gray-100"
                            >
                                <item.icon className="h-5 w-5" />
                                {item.label}
                            </Link>
                        ))}

                        <div className="pt-2 pb-1 px-3 text-xs font-semibold text-gray-500 uppercase mt-2">Ticketing</div>
                        {ticketingItems.map(item => {
                            const isRestricted = item.roles.every(r => ['Admin', 'Manager'].includes(r));
                            if (isRestricted && !isManager) return null;
                            return (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    onClick={() => setMobileMenuOpen(false)}
                                    className="flex items-center gap-2 px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:bg-gray-100"
                                >
                                    <item.icon className="h-5 w-5" />
                                    {item.label}
                                </Link>
                            );
                        })}


                        <div className="pt-2 pb-1 px-3 text-xs font-semibold text-gray-500 uppercase mt-2">Reports</div>
                        {reportItems.map(item => (
                            <Link
                                key={item.href}
                                href={item.href}
                                onClick={() => setMobileMenuOpen(false)}
                                className="flex items-center gap-2 px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:bg-gray-100"
                            >
                                <item.icon className="h-5 w-5" />
                                {item.label}
                            </Link>
                        ))}

                        {isManager && (
                            <>
                                <div className="pt-2 pb-1 px-3 text-xs font-semibold text-gray-500 uppercase mt-2">Settings</div>
                                {settingsItems.map((item) => (
                                    <Link
                                        key={item.href}
                                        href={item.href}
                                        onClick={() => setMobileMenuOpen(false)}
                                        className="block px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:bg-gray-100"
                                    >
                                        {item.label}
                                    </Link>
                                ))}
                            </>
                        )}

                        {isAdmin && (
                            <>
                                <div className="pt-2 pb-1 px-3 text-xs font-semibold text-gray-500 uppercase mt-2">Admin</div>
                                {adminItems.map((item) => (
                                    <Link
                                        key={item.href}
                                        href={item.href}
                                        onClick={() => setMobileMenuOpen(false)}
                                        className="block px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:bg-gray-100"
                                    >
                                        {item.label}
                                    </Link>
                                ))}
                            </>
                        )}

                        <button
                            onClick={handleLogout}
                            className="w-full text-left px-3 py-2 rounded-md text-base font-medium text-red-600 hover:bg-red-50 mt-4"
                        >
                            <LogOut className="h-5 w-5 inline mr-2" />
                            Logout
                        </button>
                    </div>
                </div>
            )}
        </nav>
    );
}
