'use client';

import type { RevenueTrendResponse } from '@frontend/api-client';
import {
  Card,
  CardActions,
  CardContent,
  CardHeader,
  CardTitle,
  Button,
  ChartColumnIcon,
  Checkbox,
  DownloadIcon,
  Swatch,
  ToggleButton,
  useSelectionSet,
} from '@frontend/ui';
import { useTranslations } from 'next-intl';
import { useMemo, useRef } from 'react';
import { EXPORT_IGNORE_ATTRIBUTE, useExportPng } from '../hooks/use-export-png';
import { useViewState } from '../hooks/use-view-state';
import { toChartRows } from '../lib/chart-data';
import { SERIES, type SeriesKey } from '../lib/series';
import { KpiSummary } from './kpi-summary';
import { RevenueChart } from './revenue-chart';
import { RevenueLegend } from './revenue-legend';

export interface RevenueTrendCardProps {
  trend: RevenueTrendResponse;
}

/** Interactive dashboard card. View state (compare mode, visible series) lives in the URL; data comes from props. */
export function RevenueTrendCard({ trend }: RevenueTrendCardProps) {
  const t = useTranslations('dashboard');
  const [view, setView] = useViewState();
  const { compare } = view;
  const selected = useMemo(() => new Set(view.series), [view.series]);
  const series = useSelectionSet<SeriesKey>({
    value: selected,
    onChange: (next) => setView({ series: [...next] }),
    min: 1,
  });
  const rows = useMemo(() => toChartRows(trend.days), [trend.days]);
  const cardRef = useRef<HTMLElement>(null);
  const exporter = useExportPng(cardRef, `revenue-trend-${trend.week.start}.png`);

  return (
    <Card ref={cardRef}>
      <CardHeader>
        <CardTitle>{t(compare ? 'titleCompare' : 'title')}</CardTitle>
        <CardActions>
          {SERIES.map(({ key, currentColor }) => (
            <Checkbox
              key={key}
              label={t(`series.${key}.label`)}
              adornment={<Swatch color={currentColor} shape="line" />}
              checked={series.isSelected(key)}
              disabled={series.isSelected(key) && !series.canDeselect(key)}
              onChange={() => series.toggle(key)}
            />
          ))}
          <ToggleButton
            pressed={compare}
            onPressedChange={(pressed) => setView({ compare: pressed })}
          >
            <ChartColumnIcon aria-hidden />
            {t('compare')}
          </ToggleButton>
          <Button
            variant="outline"
            loading={exporter.isExporting}
            onClick={exporter.exportPng}
            {...{ [EXPORT_IGNORE_ATTRIBUTE]: true }}
          >
            {!exporter.isExporting && <DownloadIcon aria-hidden />}
            {t('export')}
          </Button>
          {exporter.failed && (
            <p role="alert" className="w-full text-sm text-negative lg:text-right">
              {t('exportError')}
            </p>
          )}
        </CardActions>
      </CardHeader>
      <CardContent>
        <KpiSummary summary={trend.summary} compare={compare} />
        {/* Below md the chart scrolls inside the card (see RevenueChart): say so. */}
        <p
          className="text-center text-xs text-muted-foreground md:hidden"
          data-testid="chart-scroll-hint"
        >
          {t('scrollHint')}
        </p>
        <RevenueChart rows={rows} compare={compare} isVisible={series.isSelected} />
        <RevenueLegend compare={compare} isVisible={series.isSelected} />
      </CardContent>
    </Card>
  );
}
