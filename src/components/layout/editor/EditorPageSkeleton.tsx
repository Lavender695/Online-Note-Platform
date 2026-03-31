import { Skeleton } from '@/components/ui/skeleton';

export default function EditorPageSkeleton() {
  return (
    <div className="relative h-full min-h-screen w-full overflow-hidden">
      <div className="fixed left-0 right-0 top-0 z-50 border-b border-border bg-background/95 backdrop-blur md:left-(--sidebar-width)">
        <div className="flex items-center gap-2 overflow-hidden px-3 py-2 sm:px-6">
          <Skeleton className="h-8 w-16 rounded-full" />
          <Skeleton className="h-8 w-24 rounded-full" />
          <Skeleton className="h-8 w-10 rounded-md" />
          <Skeleton className="ml-auto h-8 w-24 rounded-md" />
        </div>
      </div>

      <div className="mt-10 px-4 pb-8 pt-6 sm:px-8">
        <div className="space-y-4 rounded-lg border border-border/60 bg-background p-6">
          <Skeleton className="h-10 w-2/5 rounded-md" />
          <Skeleton className="h-5 w-full rounded-md" />
          <Skeleton className="h-5 w-11/12 rounded-md" />
          <Skeleton className="h-5 w-10/12 rounded-md" />
          <Skeleton className="h-5 w-9/12 rounded-md" />
          <Skeleton className="h-5 w-4/5 rounded-md" />
        </div>
      </div>
    </div>
  );
}
