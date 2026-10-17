'use client';

import type { EventImpact } from '@frontend/api-client';
import { Button, Card, ConfirmDialog, useToast } from '@frontend/ui';
import { useTranslations } from 'next-intl';
import { useState, useTransition } from 'react';
import { WeekPicker } from '@/components/week-picker/week-picker';
import { useMessage } from '@/i18n/use-message';
import { deleteEventAction } from '../actions';
import { EventFormDialog } from './event-form-dialog';
import { EventsTable } from './events-table';

export interface EventsManagerProps {
  weekStart: string;
  events: EventImpact[];
  /** Role-based UI: the server enforces the same permissions on every action. */
  canWrite: boolean;
  canDelete: boolean;
}

/** Client island: add/edit dialog and delete confirmation. Data comes from the server page (revalidated by actions). */
export function EventsManager({ weekStart, events, canWrite, canDelete }: EventsManagerProps) {
  const t = useTranslations('events');
  const message = useMessage();
  const { toast } = useToast();
  const [editing, setEditing] = useState<{ event: EventImpact | null } | null>(null);
  const [deleting, setDeleting] = useState<EventImpact | null>(null);
  const [deletePending, startDelete] = useTransition();

  const confirmDelete = () =>
    startDelete(async () => {
      if (!deleting) return;
      const result = await deleteEventAction(deleting.id);
      if (result.status === 'success') {
        toast({
          title: message(result.message) ?? t('deleted'),
          description: deleting.title,
          tone: 'success',
        });
        setDeleting(null);
      } else if (result.status === 'error') {
        toast({ title: t('deleteFailed'), description: message(result.message), tone: 'error' });
      }
    });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <WeekPicker weekStart={weekStart} />
        {canWrite && <Button onClick={() => setEditing({ event: null })}>{t('add')}</Button>}
      </div>

      {events.length === 0 ? (
        <Card role="status" className="items-start">
          <p className="font-medium">{t('empty.title')}</p>
          <p className="text-sm text-muted-foreground">{t('empty.description')}</p>
        </Card>
      ) : (
        <EventsTable
          events={events}
          onEdit={canWrite ? (event) => setEditing({ event }) : undefined}
          onDelete={canDelete ? setDeleting : undefined}
        />
      )}

      {canWrite && (
        <EventFormDialog
          event={editing?.event ?? null}
          defaultDate={weekStart}
          open={editing !== null}
          onOpenChange={(open) => !open && setEditing(null)}
        />
      )}
      {canDelete && (
        <ConfirmDialog
          open={deleting !== null}
          onOpenChange={(open) => !open && setDeleting(null)}
          destructive
          loading={deletePending}
          title={t('confirmDelete.title')}
          description={deleting && t('confirmDelete.description', { title: deleting.title })}
          confirmLabel={t('delete')}
          cancelLabel={t('form.cancel')}
          onConfirm={confirmDelete}
        />
      )}
    </div>
  );
}
