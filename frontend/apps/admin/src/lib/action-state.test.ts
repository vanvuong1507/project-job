import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { fieldErrorFor, fieldErrorsOf } from './action-state';

describe('action state helpers', () => {
  it('maps zod issues to the first message per dotted path', () => {
    const schema = z.object({
      email: z.email('Enter a valid email'),
      days: z.array(z.object({ covers: z.number().int('Whole number') })),
    });
    const result = schema.safeParse({ email: 'x', days: [{ covers: 1 }, { covers: 1.5 }] });

    expect(fieldErrorsOf(result.error!)).toEqual({
      email: 'Enter a valid email',
      'days.1.covers': 'Whole number',
    });
  });

  it('reads a field error only from an error state', () => {
    expect(
      fieldErrorFor({ status: 'error', message: 'x', fieldErrors: { email: 'Bad' } }, 'email'),
    ).toBe('Bad');
    expect(fieldErrorFor({ status: 'success' }, 'email')).toBeUndefined();
  });
});
