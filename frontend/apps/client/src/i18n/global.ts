import type { CommonMessages } from '@frontend/i18n';
import type messages from './messages/en.json';
import type { routing } from './routing';

/** Type-checked locales and message keys (`useTranslations('dashboard')('title')`). */
declare module 'next-intl' {
  interface AppConfig {
    Locale: (typeof routing.locales)[number];
    Messages: typeof messages & { common: CommonMessages };
  }
}
