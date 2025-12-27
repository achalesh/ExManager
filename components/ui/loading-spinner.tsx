import { cn } from "@/lib/utils";

interface LoadingSpinnerProps extends React.HTMLAttributes<HTMLDivElement> {
    size?: "sm" | "md" | "lg" | "xl";
}

export function LoadingSpinner({ size = "md", className, ...props }: LoadingSpinnerProps) {
    const sizeClasses = {
        sm: "h-4 w-4 border-2",
        md: "h-8 w-8 border-3",
        lg: "h-12 w-12 border-4",
        xl: "h-16 w-16 border-4",
    };

    return (
        <div className={cn("relative flex items-center justify-center", className)} {...props}>
            <div
                className={cn(
                    "animate-spin rounded-full border-t-transparent border-primary",
                    sizeClasses[size]
                )}
            />
            <div
                className={cn(
                    "absolute animate-ping rounded-full bg-primary/20",
                    size === "sm" ? "h-4 w-4" :
                        size === "md" ? "h-8 w-8" :
                            size === "lg" ? "h-12 w-12" : "h-16 w-16"
                )}
            />
        </div>
    );
}
