import { Card } from '@frontend/ui';
import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';

export default async function NotFound() {
  const t = await getTranslations('common.errors');
  return (
    <main className="mx-auto max-w-xl p-6">
      <Card>
        <h1 className="text-lg font-semibold">{t('notFound')}</h1>
        <Link href="/" className="mt-4 inline-block text-sm font-medium underline">
          {t('backHome')}
        </Link>
      </Card>
    </main>
  );
}
