import { LoadingSpinner } from "@/components/ui/loading-spinner";

export default function DashboardLoading() {
    return (
        <div className="flex h-[calc(100vh-4rem)] w-full items-center justify-center bg-gray-50/50 backdrop-blur-sm">
            <div className="flex flex-col items-center gap-4">
                <LoadingSpinner size="xl" className="text-blue-600" />
                <p className="text-sm font-medium text-gray-500 animate-pulse">Loading Dashboard...</p>
            </div>
        </div>
    );
}
