import { getTranslations } from 'next-intl/server';
import { EventsManager } from '@/features/events/components/events-manager';
import { can } from '@/lib/permissions';
import { resolveWeekStart } from '@/lib/week';
import { requirePermission } from '@/server/authz';
import { listWeekEvents } from '@/server/events';

export async function generateMetadata() {
  const t = await getTranslations('events');
  return { title: t('title') };
}

export default async function EventsPage({ searchParams }: PageProps<'/[locale]/events'>) {
  const [user, t] = await Promise.all([
    requirePermission('events:read'),
    getTranslations('events'),
  ]);
  const weekStart = resolveWeekStart((await searchParams).weekStart);
  const events = await listWeekEvents(weekStart);

  return (
    <section className="flex flex-col gap-4">
      <header>
        <h1 className="text-xl font-semibold">{t('title')}</h1>
        <p className="text-sm text-muted-foreground">{t('description')}</p>
      </header>
      <EventsManager
        weekStart={weekStart}
        events={events}
        canWrite={can(user.role, 'events:write')}
        canDelete={can(user.role, 'events:delete')}
      />
    </section>
  );
}
