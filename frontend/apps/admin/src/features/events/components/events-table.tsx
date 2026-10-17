import type { EventImpact } from '@frontend/api-client';
import {
  Button,
  IconBadge,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TrendingDownIcon,
  TrendingUpIcon,
} from '@frontend/ui';
import { useLocale, useTranslations } from 'next-intl';
import { dayLabel, formatShortDate } from '@/lib/week';

export interface EventsTableProps {
  events: EventImpact[];
  /** Omitted when the user may not edit/delete — the column disappears. */
  onEdit?: (event: EventImpact) => void;
  onDelete?: (event: EventImpact) => void;
}

/**
 * Presentational events list: a table from `lg`, a stack of cards below it so the actions never
 * end up off-screen (the table would scroll sideways on phones and tablets).
 */
export function EventsTable({ events, onEdit, onDelete }: EventsTableProps) {
  const t = useTranslations('events');
  const locale = useLocale();
  const hasActions = Boolean(onEdit || onDelete);
  const dateOf = (event: EventImpact) =>
    `${dayLabel(event.date, locale)} ${formatShortDate(event.date, locale)}`;
  const actions = (event: EventImpact) =>
    hasActions && <EventActions event={event} onEdit={onEdit} onDelete={onDelete} />;

  return (
    <>
      <ul className="flex flex-col gap-3 lg:hidden" aria-label={t('listLabel')}>
        {events.map((event) => (
          <li
            key={event.id}
            className="flex flex-col gap-2 rounded-tile border border-border bg-surface p-4"
          >
            <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
              <span className="text-muted-foreground">{dateOf(event)}</span>
              <ImpactLabel impact={event.impact} />
            </div>
            <p className="font-medium">{event.title}</p>
            {event.description && (
              <p className="text-sm text-muted-foreground">{event.description}</p>
            )}
            {actions(event)}
          </li>
        ))}
      </ul>

      <Table wrapperClassName="max-lg:hidden">
        <TableHeader>
          <TableRow>
            <TableHead>{t('columns.date')}</TableHead>
            <TableHead>{t('columns.impact')}</TableHead>
            <TableHead>{t('columns.title')}</TableHead>
            <TableHead>{t('columns.description')}</TableHead>
            {hasActions && (
              <TableHead className="text-right">
                <span className="sr-only">{t('columns.actions')}</span>
              </TableHead>
            )}
          </TableRow>
        </TableHeader>
        <TableBody>
          {events.map((event) => (
            <TableRow key={event.id}>
              <TableCell className="whitespace-nowrap">{dateOf(event)}</TableCell>
              <TableCell>
                <ImpactLabel impact={event.impact} />
              </TableCell>
              <TableCell className="font-medium">{event.title}</TableCell>
              <TableCell className="max-w-xs text-muted-foreground">{event.description}</TableCell>
              {hasActions && <TableCell>{actions(event)}</TableCell>}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </>
  );
}

function ImpactLabel({ impact }: { impact: EventImpact['impact'] }) {
  const t = useTranslations('events');
  const positive = impact === 'POSITIVE';
  return (
    <span className="inline-flex items-center gap-2 whitespace-nowrap">
      <IconBadge size="sm" tone={positive ? 'positive' : 'negative'}>
        {positive ? <TrendingUpIcon /> : <TrendingDownIcon />}
      </IconBadge>
      {t(`impact.${impact}`)}
    </span>
  );
}

function EventActions({
  event,
  onEdit,
  onDelete,
}: { event: EventImpact } & Pick<EventsTableProps, 'onEdit' | 'onDelete'>) {
  const t = useTranslations('events');
  return (
    <div className="flex justify-end gap-2">
      {onEdit && (
        <Button
          size="sm"
          variant="outline"
          aria-label={t('editLabel', { title: event.title })}
          onClick={() => onEdit(event)}
        >
          {t('edit')}
        </Button>
      )}
      {onDelete && (
        <Button
          size="sm"
          variant="ghost"
          className="text-negative"
          aria-label={t('deleteLabel', { title: event.title })}
          onClick={() => onDelete(event)}
        >
          {t('delete')}
        </Button>
      )}
    </div>
  );
}
