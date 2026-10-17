import type { Meta, StoryObj } from '@storybook/react-vite';
import { formatCurrency, formatNumber } from '../../lib/format';
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from './table';

const meta = {
  title: 'Data/Table',
  component: Table,
  parameters: { layout: 'padded' },
} satisfies Meta<typeof Table>;

export default meta;
type Story = StoryObj<typeof meta>;

const rows = [
  { day: 'Mon', pos: 1720, eatclub: 310, covers: 118 },
  { day: 'Tue', pos: 1790, eatclub: 320, covers: 120 },
  { day: 'Wed', pos: 1800, eatclub: 320, covers: 121 },
];

export const WeeklyMetrics: Story = {
  render: () => (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Day</TableHead>
          <TableHead className="text-right">POS Revenue</TableHead>
          <TableHead className="text-right">Eatclub Revenue</TableHead>
          <TableHead className="text-right">Covers</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row) => (
          <TableRow key={row.day}>
            <TableHead scope="row" className="text-foreground">
              {row.day}
            </TableHead>
            <TableCell className="text-right tabular-nums">{formatCurrency(row.pos)}</TableCell>
            <TableCell className="text-right tabular-nums">{formatCurrency(row.eatclub)}</TableCell>
            <TableCell className="text-right tabular-nums">{formatNumber(row.covers)}</TableCell>
          </TableRow>
        ))}
      </TableBody>
      <TableFooter>
        <TableRow>
          <TableHead scope="row">Total</TableHead>
          <TableCell className="text-right tabular-nums" colSpan={2}>
            {formatCurrency(6280)}
          </TableCell>
          <TableCell className="text-right tabular-nums">{formatNumber(359)}</TableCell>
        </TableRow>
      </TableFooter>
    </Table>
  ),
};
