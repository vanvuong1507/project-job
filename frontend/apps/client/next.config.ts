import { createNextConfig } from '@frontend/next-config';
import createNextIntlPlugin from 'next-intl/plugin';
import './src/env';

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

export default withNextIntl(createNextConfig());
