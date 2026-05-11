import { Skeleton } from "@/components/ui/skeleton";

export default function ChatLoading() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mx-auto max-w-4xl">
        {/* Header skeleton */}
        <div className="mb-6 flex items-center justify-between border-b pb-4">
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-4 w-40" />
        </div>

        {/* Messages skeleton */}
        <div className="mb-4 min-h-[50vh] space-y-4">
          {/* AI message */}
          <div className="max-w-[80%]">
            <Skeleton className="mb-2 h-4 w-12" />
            <Skeleton className="h-20 w-full rounded-lg" />
          </div>

          {/* User message */}
          <div className="ml-auto max-w-[80%]">
            <Skeleton className="mb-2 ml-auto h-4 w-12" />
            <Skeleton className="h-12 w-full rounded-lg" />
          </div>

          {/* AI message */}
          <div className="max-w-[80%]">
            <Skeleton className="mb-2 h-4 w-12" />
            <Skeleton className="h-32 w-full rounded-lg" />
          </div>
        </div>

        {/* Input skeleton */}
        <div className="flex gap-2">
          <Skeleton className="h-10 flex-1 rounded-md" />
          <Skeleton className="h-10 w-20 rounded-md" />
        </div>
      </div>
    </div>
  );
}
