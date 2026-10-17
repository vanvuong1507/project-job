'use client';

import type { DailyMetric } from '@frontend/api-client';
import { Button, useToast } from '@frontend/ui';
import { useTranslations } from 'next-intl';
import { useActionState, useCallback, useEffect, useMemo, useState } from 'react';
import { useMessage } from '@/i18n/use-message';
import { WeekPicker } from '@/components/week-picker/week-picker';
import { IDLE, type ActionState } from '@/lib/action-state';
import { weekDays } from '@/lib/week';
import { saveWeekAction } from '../actions';
import { sameRows, toRow, validateRows, type CellErrors, type FieldKey } from '../lib/metrics-form';
import { MetricsTable } from './metrics-table';

export interface WeeklyMetricsFormProps {
  weekStart: string;
  metrics: DailyMetric[];
  dashboardUrl: string;
  /** VIEWER role: values are shown but can't be edited or saved (the server enforces it too). */
  readOnly?: boolean;
}

/** Client island: typed values, live validation and totals, unsaved-change guard; saving is a Server Action. */
export function WeeklyMetricsForm({
  weekStart,
  metrics,
  dashboardUrl,
  readOnly = false,
}: WeeklyMetricsFormProps) {
  const t = useTranslations('metrics');
  const message = useMessage();
  const { toast } = useToast();
  const dates = useMemo(() => weekDays(weekStart), [weekStart]);
  const savedRows = useMemo(
    () => dates.map((date) => toRow(metrics.find((m) => m.date === date))),
    [dates, metrics],
  );

  const [rows, setRows] = useState(savedRows);
  const [dismissed, setDismissed] = useState<CellErrors>({});

  // Handle each result where it is produced (no effect): toast, and forget cells edited before this save.
  // Wrapping the Server Action makes this form need JavaScript — fine for a live-validated editor.
  const save = async (previous: ActionState, formData: FormData): Promise<ActionState> => {
    const result = await saveWeekAction(weekStart, previous, formData);
    setDismissed({});
    if (result.status === 'success')
      toast({ title: message(result.message) ?? t('saved'), tone: 'success' });
    if (result.status === 'error') {
      toast({
        title: t('saveFailed'),
        description: message(result.message, result.messageValues),
        tone: 'error',
      });
    }
    return result;
  };
  const [state, formAction, saving] = useActionState(save, IDLE);

  const clientErrors = useMemo(() => validateRows(rows), [rows]);
  const serverErrors = useMemo(() => {
    if (state.status !== 'error') return {};
    // `days.3.covers` → `3.covers`, minus cells edited since.
    const entries = Object.entries(state.fieldErrors ?? {}).map(
      ([key, message]) => [key.replace(/^days\./, ''), message] as const,
    );
    return Object.fromEntries(entries.filter(([key]) => !(key in dismissed)));
  }, [state, dismissed]);
  const errors = { ...serverErrors, ...clientErrors };
  // Numeric comparison: after a save, "1234.50" typed and 1234.5 stored are the same value.
  const dirty = !sameRows(rows, savedRows);

  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);
  const canLeave = useCallback(() => !dirty || window.confirm(t('leaveConfirm')), [dirty, t]);

  const update = (index: number, key: FieldKey, value: string) => {
    setRows((current) => current.map((row, i) => (i === index ? { ...row, [key]: value } : row)));
    setDismissed((current) => ({ ...current, [`${index}.${key}`]: '' }));
  };

  return (
    <form action={formAction} noValidate className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <WeekPicker weekStart={weekStart} canLeave={canLeave} />
        <a
          href={`${dashboardUrl}/?weekStart=${weekStart}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm font-medium text-foreground underline underline-offset-4"
        >
          {t('viewDashboard')}
        </a>
      </div>

      <MetricsTable
        dates={dates}
        rows={rows}
        errors={errors}
        readOnly={readOnly}
        onChange={update}
      />

      <div className="flex items-center justify-end gap-3">
        {dirty && <span className="text-sm text-muted-foreground">{t('unsaved')}</span>}
        {readOnly ? (
          <span className="text-sm text-muted-foreground" data-testid="read-only-notice">
            {t('readOnly')}
          </span>
        ) : (
          <Button type="submit" loading={saving} disabled={Object.keys(clientErrors).length > 0}>
            {t('save')}
          </Button>
        )}
      </div>
    </form>
  );
}
