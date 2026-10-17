import {
  cn,
  Field,
  formatNumber,
  Input,
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from '@frontend/ui';
import { useLocale, useTranslations } from 'next-intl';
import { useMessage } from '@/i18n/use-message';
import { dayLabel, formatShortDate } from '@/lib/week';
import {
  FIELDS,
  formatMoney,
  inputName,
  weekTotals,
  type CellErrors,
  type FieldKey,
  type Row,
} from '../lib/metrics-form';

export interface MetricsTableProps {
  dates: readonly string[];
  rows: readonly Row[];
  /** Cell → message key (`validation.*`). */
  errors: CellErrors;
  readOnly: boolean;
  onChange: (index: number, key: FieldKey, value: string) => void;
}

/**
 * Presentational 7-day grid + live totals. Inputs carry `name`s so the Server Action can read them.
 * From `md` it is a table; below, CSS turns each day into a card with a 2×2 grid of labelled inputs
 * (one DOM for both layouts: duplicating the inputs would submit every value twice).
 */
export function MetricsTable({ dates, rows, errors, readOnly, onChange }: MetricsTableProps) {
  const t = useTranslations('metrics');
  const message = useMessage();
  const locale = useLocale();
  const totals = weekTotals(rows);

  return (
    <Table className="max-md:block" wrapperClassName={CARDS.wrapper}>
      <TableHeader className="max-md:hidden">
        <TableRow>
          <TableHead>{t('day')}</TableHead>
          {FIELDS.map(({ key }) => (
            <TableHead key={key} className="min-w-32">
              {t(`fields.${key}`)}
            </TableHead>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody className={CARDS.body}>
        {dates.map((date, index) => (
          <TableRow key={date} className={CARDS.row}>
            <TableHead scope="row" className={cn('align-top text-foreground', CARDS.dayHeader)}>
              <span className="block max-md:inline">{dayLabel(date, locale)}</span>{' '}
              <span className="font-normal text-muted-foreground">
                {formatShortDate(date, locale)}
              </span>
            </TableHead>
            {FIELDS.map(({ key, step }) => (
              <TableCell key={key} className="align-top max-md:p-0">
                <span aria-hidden className="mb-1 block text-xs text-muted-foreground md:hidden">
                  {t(`fields.${key}`)}
                </span>
                <Field
                  label={t('cellLabel', {
                    field: t(`fields.${key}`),
                    day: dayLabel(date, locale),
                    date: formatShortDate(date, locale),
                  })}
                  hideLabel
                  error={message(errors[`${index}.${key}`])}
                >
                  {(control) => (
                    <Input
                      {...control}
                      name={inputName(index, key)}
                      type="number"
                      inputMode={key === 'covers' ? 'numeric' : 'decimal'}
                      min={0}
                      step={step}
                      readOnly={readOnly}
                      value={rows[index]![key]}
                      onChange={(event) => onChange(index, key, event.target.value)}
                    />
                  )}
                </Field>
              </TableCell>
            ))}
          </TableRow>
        ))}
      </TableBody>
      <TableFooter className={CARDS.footer}>
        <TableRow className={CARDS.footerRow}>
          <TableHead scope="row" className="text-foreground max-md:h-auto max-md:p-0">
            {t('totals.row')}
          </TableHead>
          <TableCell colSpan={2} className="max-md:p-0" data-testid="total-revenue">
            {t('totals.revenue', { value: formatMoney(totals.revenue, locale) })}
          </TableCell>
          <TableCell className="max-md:p-0" data-testid="total-labour">
            {t('totals.labour', { value: formatMoney(totals.labour, locale) })}
          </TableCell>
          <TableCell className="max-md:p-0" data-testid="total-covers">
            {t('totals.covers', { value: formatNumber(totals.covers, { locale }) })}
          </TableCell>
        </TableRow>
      </TableFooter>
    </Table>
  );
}

/** Below `md`: table elements become a stack of day cards (layout only; semantics stay a table). */
const CARDS = {
  wrapper: 'max-md:overflow-visible max-md:rounded-none max-md:border-0',
  body: 'max-md:flex max-md:flex-col max-md:gap-3',
  // `border!`: TableBody removes the last row's border, which the last card still needs.
  row: 'max-md:grid max-md:grid-cols-2 max-md:gap-3 max-md:rounded-tile max-md:border! max-md:border-border max-md:bg-surface max-md:p-3',
  dayHeader: 'max-md:col-span-2 max-md:h-auto max-md:p-0 max-md:text-sm',
  footer: 'max-md:mt-3 max-md:block max-md:rounded-tile max-md:border-0',
  footerRow:
    'max-md:flex max-md:flex-col max-md:gap-1 max-md:rounded-tile max-md:border-0 max-md:p-3',
};
