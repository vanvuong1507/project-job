import { z } from 'zod';
import { type FieldErrors, ValidationException, ZodValidationPipe } from './zod-validation.pipe.js';

/** The `details` of the ValidationException thrown by `run`, or `undefined` if nothing was thrown. */
function detailsOf(run: () => unknown): FieldErrors | undefined {
  try {
    run();
    return undefined;
  } catch (error) {
    if (!(error instanceof ValidationException)) throw error;
    return error.details;
  }
}

describe('ZodValidationPipe', () => {
  const schema = z.object({ days: z.array(z.object({ covers: z.number().int() })) });

  it('returns the parsed value', () => {
    expect(new ZodValidationPipe(schema).transform({ days: [{ covers: 1 }] })).toEqual({
      days: [{ covers: 1 }],
    });
  });

  it('reports nested issues under dotted paths', () => {
    const details = detailsOf(() =>
      new ZodValidationPipe(schema).transform({ days: [{ covers: 1 }, { covers: 1.5 }] }),
    );
    expect(details).toEqual({ 'days.1.covers': ['Invalid input: expected int, received number'] });
  });

  it('reports a single param under its name', () => {
    const details = detailsOf(() =>
      new ZodValidationPipe(z.uuid('Invalid id'), 'id').transform('nope'),
    );
    expect(details).toEqual({ id: ['Invalid id'] });
  });
});
