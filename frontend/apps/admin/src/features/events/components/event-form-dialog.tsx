'use client';

import type { EventImpact } from '@frontend/api-client';
import {
  Button,
  Dialog,
  DialogDescription,
  DialogFooter,
  DialogTitle,
  Field,
  Input,
  Select,
  Textarea,
  useToast,
} from '@frontend/ui';
import { useTranslations } from 'next-intl';
import { useActionState } from 'react';
import { useMessage } from '@/i18n/use-message';
import { fieldErrorFor, IDLE, submittedValue, type ActionState } from '@/lib/action-state';
import { createEventAction, updateEventAction } from '../actions';

export interface EventFormDialogProps {
  /** `null` creates a new event. */
  event: EventImpact | null;
  defaultDate: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EventFormDialog({ event, defaultDate, open, onOpenChange }: EventFormDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {/* Remount per opening so the form always starts from the event being edited. */}
      {open && (
        <EventForm event={event} defaultDate={defaultDate} onDone={() => onOpenChange(false)} />
      )}
    </Dialog>
  );
}

type FormField = 'date' | 'impact' | 'title' | 'description';

function EventForm({
  event,
  defaultDate,
  onDone,
}: {
  event: EventImpact | null;
  defaultDate: string;
  onDone: () => void;
}) {
  const t = useTranslations('events');
  const message = useMessage();
  const { toast } = useToast();

  // Handle the result where it is produced: close + toast on success, keep the dialog open on errors.
  const submit = async (previous: ActionState, formData: FormData): Promise<ActionState> => {
    const result = event
      ? await updateEventAction(event.id, previous, formData)
      : await createEventAction(previous, formData);
    if (result.status === 'success') {
      toast({
        title: message(result.message) ?? '',
        description: String(formData.get('title') ?? ''),
        tone: 'success',
      });
      onDone();
    } else if (result.status === 'error' && !result.fieldErrors) {
      toast({ title: t('saveFailed'), description: message(result.message), tone: 'error' });
    }
    return result;
  };
  const [state, formAction, saving] = useActionState(submit, IDLE);

  const initial: Record<FormField, string> = {
    date: event?.date ?? defaultDate,
    impact: event?.impact ?? 'POSITIVE',
    title: event?.title ?? '',
    description: event?.description ?? '',
  };
  // React resets the form after an action; defaultValues restore what was submitted (or the event).
  const value = (field: FormField) => submittedValue(state, field) ?? initial[field];
  const error = (field: FormField) => message(fieldErrorFor(state, field));

  return (
    <form action={formAction} noValidate className="flex flex-col gap-4">
      <DialogTitle>{t(event ? 'form.editTitle' : 'form.addTitle')}</DialogTitle>
      <DialogDescription>{t('form.intro')}</DialogDescription>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={t('form.date')} error={error('date')} required>
          {(control) => <Input {...control} name="date" type="date" defaultValue={value('date')} />}
        </Field>
        <Field label={t('form.impact')} error={error('impact')} required>
          {(control) => (
            <Select {...control} name="impact" defaultValue={value('impact')}>
              <option value="POSITIVE">{t('impact.POSITIVE')}</option>
              <option value="NEGATIVE">{t('impact.NEGATIVE')}</option>
            </Select>
          )}
        </Field>
      </div>
      <Field label={t('form.title')} hint={t('form.titleHint')} error={error('title')} required>
        {(control) => (
          <Input {...control} name="title" maxLength={120} defaultValue={value('title')} />
        )}
      </Field>
      <Field
        label={t('form.description')}
        hint={t('form.descriptionHint')}
        error={error('description')}
      >
        {(control) => (
          <Textarea {...control} name="description" defaultValue={value('description')} />
        )}
      </Field>
      <DialogFooter>
        <Button variant="outline" disabled={saving} onClick={onDone}>
          {t('form.cancel')}
        </Button>
        <Button type="submit" loading={saving}>
          {t(event ? 'form.submitEdit' : 'form.submitAdd')}
        </Button>
      </DialogFooter>
    </form>
  );
}
