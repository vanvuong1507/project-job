import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { useSelectionSet } from '../../hooks/use-selection-set';
import { ChartColumnIcon, DownloadIcon, TrendingDownIcon, TrendingUpIcon } from '../../icons';
import { formatCurrency, formatNumber } from '../../lib/format';
import type { ColorToken } from '../../theme/tokens';
import { Button } from '../button';
import { Checkbox } from '../checkbox';
import { Legend, LegendItem, LegendSeparator } from '../legend';
import { Skeleton } from '../skeleton';
import { StatCard } from '../stat-card';
import { Swatch } from '../swatch';
import { ToggleButton } from '../toggle-button';
import { Card, CardActions, CardContent, CardHeader, CardTitle } from './card';

const meta = {
  title: 'Components/Card',
  component: Card,
  parameters: { layout: 'padded' },
} satisfies Meta<typeof Card>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Basic: Story = {
  render: () => (
    <Card className="max-w-md">
      <CardHeader>
        <CardTitle>Card title</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">Card content.</p>
      </CardContent>
    </Card>
  ),
};

const SERIES = [
  { key: 'pos', label: 'POS Revenue', color: 'chart-pos' },
  { key: 'eatclub', label: 'Eatclub Revenue', color: 'chart-eatclub' },
  { key: 'labour', label: 'Labour Costs', color: 'chart-labour' },
] as const satisfies ReadonlyArray<{ key: string; label: string; color: ColorToken }>;

type SeriesKey = (typeof SERIES)[number]['key'];

/** How the common components compose into the reference screen (docs/ui-reference). Chart is app-level. */
function RevenueCardComposition() {
  const [compare, setCompare] = useState(true);
  const series = useSelectionSet<SeriesKey>({ defaultValue: SERIES.map((s) => s.key), min: 1 });

  return (
    <Card>
      <CardHeader>
        <CardTitle>This Week&apos;s Revenue Trend{compare && ' vs Previous Period'}</CardTitle>
        <CardActions>
          {SERIES.map(({ key, label, color }) => (
            <Checkbox
              key={key}
              label={label}
              adornment={<Swatch color={color} shape="line" />}
              checked={series.isSelected(key)}
              disabled={!series.canDeselect(key) && series.isSelected(key)}
              onChange={() => series.toggle(key)}
            />
          ))}
          <ToggleButton pressed={compare} onPressedChange={setCompare}>
            <ChartColumnIcon aria-hidden />
            Compare to Previous
          </ToggleButton>
          <Button variant="outline">
            <DownloadIcon aria-hidden />
            Export PNG
          </Button>
        </CardActions>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 sm:grid-cols-3">
          <StatCard
            label="Total Revenue"
            value={formatCurrency(15974)}
            comparison={compare ? { value: formatCurrency(14982), delta: 6.6 } : undefined}
          />
          <StatCard
            label="Average per Day"
            value={formatCurrency(2282)}
            comparison={compare ? { value: formatCurrency(2140), delta: 6.6 } : undefined}
          />
          <StatCard
            label="Total Covers"
            value={formatNumber(871)}
            comparison={compare ? { value: formatNumber(820), delta: 6.2 } : undefined}
          />
        </div>
        <Skeleton className="h-72 animate-none" />
        <Legend>
          {SERIES.map(({ key, label, color }) => (
            <LegendItem
              key={key}
              indicator={<Swatch color={color} />}
              inactive={!series.isSelected(key)}
            >
              {label}
            </LegendItem>
          ))}
          <LegendSeparator />
          <LegendItem indicator={<TrendingUpIcon aria-hidden className="size-4 text-positive" />}>
            Positive Event Impact
          </LegendItem>
          <LegendItem indicator={<TrendingDownIcon aria-hidden className="size-4 text-negative" />}>
            Negative Event Impact
          </LegendItem>
        </Legend>
      </CardContent>
    </Card>
  );
}

export const ReferenceComposition: Story = { render: () => <RevenueCardComposition /> };
