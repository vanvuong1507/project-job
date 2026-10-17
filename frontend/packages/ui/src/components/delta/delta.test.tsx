import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Delta } from './delta';

describe('Delta', () => {
  it('renders a signed, coloured change', () => {
    render(<Delta value={6.6} parenthesized />);
    expect(screen.getByText('(+6.6%)')).toHaveClass('text-positive');
  });

  it('marks negative changes', () => {
    render(<Delta value={-3.25} />);
    expect(screen.getByText('-3.3%')).toHaveClass('text-negative');
  });

  it('renders nothing without a comparable value', () => {
    const { container } = render(<Delta value={null} />);
    expect(container).toBeEmptyDOMElement();
  });
});
