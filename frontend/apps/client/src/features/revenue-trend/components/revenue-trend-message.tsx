import { Card, CardContent, CardHeader, CardTitle } from '@frontend/ui';
import type { ReactNode } from 'react';

interface RevenueTrendMessageProps {
  title: string;
  description: ReactNode;
  action?: ReactNode;
  role?: 'status' | 'alert';
}

/** Card-shaped empty / expected-error state for the dashboard. */
export function RevenueTrendMessage({
  title,
  description,
  action,
  role = 'status',
}: RevenueTrendMessageProps) {
  return (
    <Card role={role}>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent className="items-start gap-4">
        <p className="text-sm text-muted-foreground">{description}</p>
        {action}
      </CardContent>
    </Card>
  );
}
