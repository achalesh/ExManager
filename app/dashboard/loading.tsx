import { LoadingSpinner } from "@/components/ui/loading-spinner";

export default function DashboardLoading() {
    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/20 backdrop-blur-[2px]">
            <div className="bg-white/80 backdrop-blur-md border border-white/20 shadow-2xl rounded-2xl p-8 flex flex-col items-center gap-4 min-w-[200px] animate-in fade-in zoom-in-95 duration-200">
                <LoadingSpinner size="xl" className="text-blue-600" />
                <p className="text-sm font-medium text-gray-600 animate-pulse">Please wait...</p>
            </div>
        </div>
    );
}
