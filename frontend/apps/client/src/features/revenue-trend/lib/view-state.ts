import { ALL_SERIES_KEYS, type SeriesKey } from './series';

/** Dashboard view state kept in the URL: `?compare=0` and `?series=pos,labour`. Defaults are omitted. */
export interface ViewState {
  compare: boolean;
  series: readonly SeriesKey[];
}

export const DEFAULT_VIEW: ViewState = { compare: true, series: ALL_SERIES_KEYS };

type ParamsLike = Pick<URLSearchParams, 'get'>;

const isSeriesKey = (value: string): value is SeriesKey =>
  (ALL_SERIES_KEYS as readonly string[]).includes(value);

/** Lenient: unknown values fall back to defaults, and at least one series is always visible. */
export function parseViewState(params: ParamsLike): ViewState {
  const requested = (params.get('series') ?? '').split(',').filter(isSeriesKey);
  // Canonical order + dedupe, so the URL and the UI never disagree on ordering.
  const series = ALL_SERIES_KEYS.filter((key) => requested.includes(key));
  return {
    compare: params.get('compare') !== '0',
    series: series.length > 0 ? series : DEFAULT_VIEW.series,
  };
}

/** Writes the view into a copy of `params`, leaving other params (e.g. `weekStart`) untouched. */
export function serializeViewState(view: ViewState, params: URLSearchParams): URLSearchParams {
  const next = new URLSearchParams(params);
  if (view.compare) next.delete('compare');
  else next.set('compare', '0');

  const series = ALL_SERIES_KEYS.filter((key) => view.series.includes(key));
  if (series.length === ALL_SERIES_KEYS.length || series.length === 0) next.delete('series');
  else next.set('series', series.join(','));
  return next;
}
