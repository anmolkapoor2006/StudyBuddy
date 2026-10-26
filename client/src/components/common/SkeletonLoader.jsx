
export function Skeleton({ className = "", ...props }) {
  return (
    <div
      className={`animate-pulse rounded-lg bg-white/5 dark:bg-white/5 border border-white/5 ${className}`}
      {...props}
    />
  );
}

export function CardSkeleton() {
  return (
    <div className="rounded-2xl border border-white/10 bg-[#18181b]/60 p-5 space-y-4">
      <Skeleton className="h-40 w-full rounded-xl" />
      <div className="space-y-2">
        <Skeleton className="h-5 w-3/4" />
        <Skeleton className="h-4 w-1/2" />
      </div>
      <div className="flex items-center justify-between pt-2">
        <Skeleton className="h-8 w-20 rounded-lg" />
        <Skeleton className="h-8 w-24 rounded-lg" />
      </div>
    </div>
  );
}

export function TableRowSkeleton() {
  return (
    <div className="flex items-center gap-4 py-3.5 px-4 border-b border-white/5">
      <Skeleton className="h-5 w-5 rounded" />
      <Skeleton className="h-5 w-1/3" />
      <Skeleton className="h-5 w-16 rounded-full ml-auto" />
      <Skeleton className="h-5 w-20 rounded-md" />
      <Skeleton className="h-5 w-8 rounded" />
    </div>
  );
}

export function PageLoadingFallback() {
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4">
      <div className="relative w-12 h-12">
        <div className="absolute inset-0 rounded-full border-2 border-red-500/20 border-t-[#BA3C3C] animate-spin" />
      </div>
      <p className="text-xs font-mono uppercase tracking-widest text-[#a1a1aa] animate-pulse">
        Loading module...
      </p>
    </div>
  );
}

export default Skeleton;
