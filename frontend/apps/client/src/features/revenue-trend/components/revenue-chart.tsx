'use client';

import { colorVar, formatCurrency, formatThousands, Swatch } from '@frontend/ui';
import { useLocale, useTranslations } from 'next-intl';
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  type TooltipContentProps,
} from 'recharts';
import { niceAxis } from '../lib/axis';
import { chartMax, tallestBar, type ChartRow, type ChartView } from '../lib/chart-data';
import { weekdayLabel } from '../lib/format';
import { SERIES } from '../lib/series';
import { EventMarker } from './event-marker';

/**
 * Fixed plot-area geometry: the event-marker overlay positions itself with the same numbers,
 * so markers line up with bars without measuring the SVG.
 */
export const CHART_GEOMETRY = {
  height: 320,
  margin: { top: 48, right: 8, bottom: 0, left: 0 },
  yAxisWidth: 48,
  xAxisHeight: 28,
} as const;

const ANIMATION_MS = 500;
const BAR_RADIUS: [number, number, number, number] = [4, 4, 0, 0];
const TICK_STYLE = { fontSize: 12, fill: colorVar('muted-foreground') };

export interface RevenueChartProps extends ChartView {
  rows: ChartRow[];
}

/** Stacked revenue + labour bars per day, with optional previous-period bars. */
export function RevenueChart({ rows, compare, isVisible }: RevenueChartProps) {
  const locale = useLocale();
  const axis = niceAxis(chartMax(rows, { compare, isVisible }));
  const periods = compare ? (['', 'Prev'] as const) : ([''] as const);

  const visible = SERIES.filter(({ key }) => isVisible(key));
  // Only the top segment of each stack gets rounded corners (later entries overwrite earlier ones).
  const topOfStack = new Map(visible.map(({ stack, key }) => [stack, key]));

  const bars = periods.flatMap((suffix) =>
    visible.map(({ key, stack, currentColor, previousColor }) => {
      const isTop = topOfStack.get(stack) === key;
      return (
        <Bar
          key={`${key}${suffix}`}
          dataKey={`${key}${suffix}`}
          stackId={`${stack}${suffix}`}
          fill={colorVar(suffix ? previousColor : currentColor)}
          radius={isTop ? BAR_RADIUS : 0}
          maxBarSize={32}
          animationDuration={ANIMATION_MS}
          animationEasing="ease-out"
        />
      );
    }),
  );

  return (
    // Below md the chart keeps a readable width and scrolls inside the card instead of squashing.
    <div className="max-md:-mx-6 max-md:overflow-x-auto max-md:px-6">
      <div className="relative min-w-[36rem]" data-testid="revenue-chart">
        <ResponsiveContainer width="100%" height={CHART_GEOMETRY.height}>
          <BarChart data={rows} margin={CHART_GEOMETRY.margin} barGap={4} barCategoryGap="18%">
            <CartesianGrid strokeDasharray="4 4" stroke={colorVar('chart-grid')} />
            <XAxis
              dataKey="date"
              tickFormatter={(date: string) => weekdayLabel(date, locale)}
              height={CHART_GEOMETRY.xAxisHeight}
              tickLine={false}
              axisLine={false}
              tick={TICK_STYLE}
            />
            <YAxis
              width={CHART_GEOMETRY.yAxisWidth}
              domain={[0, axis.max]}
              ticks={axis.ticks}
              tickFormatter={(value: number) => formatThousands(value, { locale })}
              tickLine={false}
              axisLine={false}
              tick={TICK_STYLE}
            />
            <Tooltip
              cursor={{ fill: colorVar('surface-muted') }}
              content={({ active, payload }) => (
                <DayTooltip
                  active={active}
                  payload={payload}
                  compare={compare}
                  isVisible={isVisible}
                />
              )}
            />
            {bars}
          </BarChart>
        </ResponsiveContainer>
        <EventMarkers rows={rows} axisMax={axis.max} view={{ compare, isVisible }} />
      </div>
    </div>
  );
}

/** HTML overlay aligned with the plot area via CHART_GEOMETRY, so markers are real, focusable buttons. */
function EventMarkers({
  rows,
  axisMax,
  view,
}: {
  rows: ChartRow[];
  axisMax: number;
  view: ChartView;
}) {
  const locale = useLocale();
  const { margin, yAxisWidth, xAxisHeight } = CHART_GEOMETRY;
  const gapAboveBar = 10;

  return (
    <div
      className="pointer-events-none absolute"
      style={{
        top: margin.top,
        right: margin.right,
        bottom: margin.bottom + xAxisHeight,
        left: margin.left + yAxisWidth,
      }}
    >
      {rows.map((row, index) =>
        row.events.length === 0 ? null : (
          <div
            key={row.date}
            className="pointer-events-auto absolute -translate-x-1/2 -translate-y-full"
            style={{
              left: `${((index + 0.5) / rows.length) * 100}%`,
              top: `calc(${(1 - tallestBar(row, view) / axisMax) * 100}% - ${gapAboveBar}px)`,
            }}
          >
            <EventMarker day={weekdayLabel(row.date, locale)} events={row.events} />
          </div>
        ),
      )}
    </div>
  );
}

interface DayTooltipProps extends ChartView {
  active?: boolean;
  payload?: TooltipContentProps<number, string>['payload'];
}

function DayTooltip({ active, payload, compare, isVisible }: DayTooltipProps) {
  const t = useTranslations('dashboard.series');
  const locale = useLocale();
  const row = payload?.[0]?.payload as ChartRow | undefined;
  if (!active || !row) return null;

  const lines = SERIES.filter(({ key }) => isVisible(key)).flatMap((series) => [
    {
      label: t(compare ? `${series.key}.current` : `${series.key}.label`),
      color: series.currentColor,
      value: row[series.key],
    },
    ...(compare
      ? [
          {
            label: t(`${series.key}.previous`),
            color: series.previousColor,
            value: row[`${series.key}Prev`],
          },
        ]
      : []),
  ]);

  return (
    <div className="rounded-control border border-border bg-surface px-3 py-2 text-xs shadow-card">
      <p className="mb-1.5 font-medium text-foreground">
        {weekdayLabel(row.date, locale)} · {row.date}
      </p>
      <ul className="space-y-1">
        {lines.map(({ label, color, value }) => (
          <li key={label} className="flex items-center gap-2">
            <Swatch color={color} />
            <span className="text-muted-foreground">{label}</span>
            <span className="ml-auto pl-3 font-medium text-foreground tabular-nums">
              {formatCurrency(value, { locale })}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
