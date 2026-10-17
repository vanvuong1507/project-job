import { buttonClasses, Card } from '@frontend/ui';
import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { requireUser } from '@/server/authz';

export async function generateMetadata() {
  const t = await getTranslations('forbidden');
  return { title: t('metaTitle') };
}

/** Where `requirePermission` (pages) and the proxy's optimistic role check send users without access. */
export default async function ForbiddenPage() {
  const [user, t] = await Promise.all([requireUser(), getTranslations()]);
  return (
    <Card role="alert" className="items-start">
      <h1 className="text-lg font-semibold">{t('forbidden.title')}</h1>
      <p className="text-sm text-muted-foreground">
        {t('forbidden.description', { email: user.email, role: t(`shell.roles.${user.role}`) })}
      </p>
      <Link href="/" className={buttonClasses({ variant: 'outline' })}>
        {t('forbidden.back')}
      </Link>
    </Card>
  );
}
