import type { ValueTransformer } from 'typeorm';

/** Postgres `numeric` arrives as a string (to avoid float loss); amounts here fit a JS number exactly. */
export const numericTransformer: ValueTransformer = {
  to: (value: number | null | undefined) => value,
  from: (value: string | null) => (value === null ? null : Number(value)),
};
