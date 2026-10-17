import { Card, CardContent, CardHeader, Skeleton } from '@frontend/ui';

/** Placeholder with the same footprint as the loaded card, so the page doesn't jump. */
export function RevenueTrendSkeleton({ label }: { label: string }) {
  return (
    <Card aria-busy="true" aria-label={label}>
      <CardHeader>
        <Skeleton className="h-7 w-72" />
        <Skeleton className="h-9 w-full max-w-xl" />
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 md:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-20 rounded-tile" />
          ))}
        </div>
        <Skeleton className="h-72" />
        <Skeleton className="mx-auto h-5 w-full max-w-2xl" />
      </CardContent>
    </Card>
  );
}
