import {
  Legend,
  LegendItem,
  LegendSeparator,
  Swatch,
  TrendingDownIcon,
  TrendingUpIcon,
} from '@frontend/ui';
import { useTranslations } from 'next-intl';
import { SERIES, type SeriesKey } from '../lib/series';

export interface RevenueLegendProps {
  compare: boolean;
  isVisible: (key: SeriesKey) => boolean;
}

/** 3 series (or 6 in compare mode: current + previous), then the event-impact keys. */
export function RevenueLegend({ compare, isVisible }: RevenueLegendProps) {
  const t = useTranslations('dashboard');

  const current = SERIES.map((series) => (
    <LegendItem
      key={series.key}
      inactive={!isVisible(series.key)}
      indicator={<Swatch color={series.currentColor} />}
    >
      {t(compare ? `series.${series.key}.current` : `series.${series.key}.label`)}
    </LegendItem>
  ));
  const previous = compare
    ? SERIES.map((series) => (
        <LegendItem
          key={`${series.key}-previous`}
          inactive={!isVisible(series.key)}
          indicator={<Swatch color={series.previousColor} />}
        >
          {t(`series.${series.key}.previous`)}
        </LegendItem>
      ))
    : [];

  return (
    <Legend aria-label={t('legend.label')}>
      {current}
      {previous}
      {/* Only on one-line layouts: after a wrap it would dangle at a line end. */}
      <LegendSeparator className="max-xl:hidden" />
      <LegendItem indicator={<TrendingUpIcon aria-hidden className="size-4 text-positive" />}>
        {t('legend.positive')}
      </LegendItem>
      <LegendItem indicator={<TrendingDownIcon aria-hidden className="size-4 text-negative" />}>
        {t('legend.negative')}
      </LegendItem>
    </Legend>
  );
}
