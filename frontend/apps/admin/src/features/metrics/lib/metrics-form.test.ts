import { describe, expect, it } from 'vitest';
import {
  inputName,
  rowsFromFormData,
  sameRows,
  toRow,
  validateRows,
  weekTotals,
  type Row,
} from './metrics-form';

const row = (over: Partial<Row> = {}): Row => ({
  ...toRow(),
  posRevenue: '100',
  eatclubRevenue: '50',
  ...over,
});

describe('metrics form helpers', () => {
  it('validates per cell with row.field keys', () => {
    expect(validateRows([row(), row({ covers: '1.5', labourCost: '' })])).toEqual({
      '1.covers': 'validation.integer',
      '1.labourCost': 'validation.number',
    });
  });

  it('totals per cell, so one invalid cell keeps the rest of its day', () => {
    expect(weekTotals([row({ covers: '-3' }), row({ covers: '10' })])).toEqual({
      revenue: 300,
      labour: 0,
      covers: 10,
    });
  });

  it('reads rows back from form data', () => {
    const data = new FormData();
    data.set(inputName(0, 'posRevenue'), '12.5');
    expect(rowsFromFormData(data, 2)).toEqual([
      { posRevenue: '12.5', eatclubRevenue: '', labourCost: '', covers: '' },
      { posRevenue: '', eatclubRevenue: '', labourCost: '', covers: '' },
    ]);
  });

  it('compares rows numerically for the unsaved-changes check', () => {
    expect(sameRows([row({ posRevenue: '1234.50' })], [row({ posRevenue: '1234.5' })])).toBe(true);
    expect(sameRows([row({ posRevenue: '1' })], [row({ posRevenue: '2' })])).toBe(false);
    expect(sameRows([row({ covers: '' })], [row({ covers: '0' })])).toBe(false);
  });
});
