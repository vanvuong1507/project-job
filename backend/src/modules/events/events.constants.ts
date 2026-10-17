export const IMPACT_TYPES = ['POSITIVE', 'NEGATIVE'] as const;
export type ImpactType = (typeof IMPACT_TYPES)[number];
