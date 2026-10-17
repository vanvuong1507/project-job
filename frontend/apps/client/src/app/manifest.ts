import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Revenue Trend',
    short_name: 'Revenue',
    description: 'Weekly revenue, labour cost and covers dashboard.',
    start_url: '/',
    display: 'standalone',
    background_color: '#f8f7f2',
    theme_color: '#2a2a2a',
    icons: [{ src: '/icon.svg', sizes: 'any', type: 'image/svg+xml' }],
  };
}
