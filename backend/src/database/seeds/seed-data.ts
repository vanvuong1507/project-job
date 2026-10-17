import type { ImpactType } from '../../modules/events/events.constants.js';

/**
 * Two weeks matching the reference video: week of 2026-10-12 totals $15,974 / 871 covers,
 * the previous week $14,982 / 820 covers (+6.6% / +6.2%). Same numbers as the frontend fixtures.
 */
export const SEED_DAILY_METRICS = [
  { date: '2026-10-05', posRevenue: 1540, eatclubRevenue: 290, labourCost: 520, covers: 110 },
  { date: '2026-10-06', posRevenue: 1810, eatclubRevenue: 330, labourCost: 640, covers: 112 },
  { date: '2026-10-07', posRevenue: 1600, eatclubRevenue: 270, labourCost: 750, covers: 114 },
  { date: '2026-10-08', posRevenue: 1550, eatclubRevenue: 270, labourCost: 540, covers: 110 },
  { date: '2026-10-09', posRevenue: 1690, eatclubRevenue: 280, labourCost: 580, covers: 106 },
  { date: '2026-10-10', posRevenue: 1940, eatclubRevenue: 680, labourCost: 780, covers: 140 },
  { date: '2026-10-11', posRevenue: 2280, eatclubRevenue: 452, labourCost: 1120, covers: 128 },
  { date: '2026-10-12', posRevenue: 1720, eatclubRevenue: 310, labourCost: 600, covers: 118 },
  { date: '2026-10-13', posRevenue: 1790, eatclubRevenue: 320, labourCost: 630, covers: 120 },
  { date: '2026-10-14', posRevenue: 1800, eatclubRevenue: 320, labourCost: 880, covers: 121 },
  { date: '2026-10-15', posRevenue: 1780, eatclubRevenue: 280, labourCost: 640, covers: 117 },
  { date: '2026-10-16', posRevenue: 1720, eatclubRevenue: 310, labourCost: 580, covers: 112 },
  { date: '2026-10-17', posRevenue: 2180, eatclubRevenue: 720, labourCost: 850, covers: 150 },
  { date: '2026-10-18', posRevenue: 2250, eatclubRevenue: 474, labourCost: 1120, covers: 133 },
];

export const SEED_EVENTS: {
  date: string;
  impact: ImpactType;
  title: string;
  description: string;
}[] = [
  {
    date: '2026-10-09',
    impact: 'POSITIVE',
    title: 'School holidays begin',
    description: 'Family bookings up across lunch service.',
  },
  {
    date: '2026-10-16',
    impact: 'NEGATIVE',
    title: 'Heavy rain',
    description: 'Storm warning kept walk-in traffic low all evening.',
  },
  {
    date: '2026-10-17',
    impact: 'POSITIVE',
    title: 'Local food festival',
    description: 'Festival crowds boosted dinner covers and Eatclub orders.',
  },
];
