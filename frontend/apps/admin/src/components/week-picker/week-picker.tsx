'use client';

import { buttonClasses, ChevronLeftIcon, ChevronRightIcon, Input } from '@frontend/ui';
import { useLocale, useTranslations } from 'next-intl';
import type { MouseEvent } from 'react';
import { Link, usePathname, useRouter } from '@/i18n/navigation';
import { addDays, formatWeekRange, isIsoDate, startOfWeek } from '@/lib/week';

export interface WeekPickerProps {
  weekStart: string;
  /** Return false to cancel navigation (e.g. unsaved changes). */
  canLeave?: () => boolean;
}

/** Monday-based week selector stored in `?weekStart=`: previous / next week and a date jump. Locale-aware. */
export function WeekPicker({ weekStart, canLeave = () => true }: WeekPickerProps) {
  const t = useTranslations('weekPicker');
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const hrefFor = (week: string) => ({ pathname, query: { weekStart: week } });

  const guard = (event: MouseEvent) => {
    if (!canLeave()) event.preventDefault();
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Link
        href={hrefFor(addDays(weekStart, -7))}
        onClick={guard}
        aria-label={t('previous')}
        className={buttonClasses({ variant: 'outline', size: 'icon' })}
      >
        <ChevronLeftIcon aria-hidden />
      </Link>
      <Input
        type="date"
        aria-label={t('weekStarting')}
        className="w-40"
        value={weekStart}
        onChange={(event) => {
          const value = event.target.value;
          if (isIsoDate(value) && canLeave()) router.push(hrefFor(startOfWeek(value)));
        }}
      />
      <Link
        href={hrefFor(addDays(weekStart, 7))}
        onClick={guard}
        aria-label={t('next')}
        className={buttonClasses({ variant: 'outline', size: 'icon' })}
      >
        <ChevronRightIcon aria-hidden />
      </Link>
      <p className="text-sm text-muted-foreground" aria-live="polite">
        {formatWeekRange(weekStart, locale)}
      </p>
    </div>
  );
}
