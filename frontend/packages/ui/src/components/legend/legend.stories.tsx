import type { Meta, StoryObj } from '@storybook/react-vite';
import { TrendingDownIcon, TrendingUpIcon } from '../../icons';
import { Swatch } from '../swatch';
import { Legend, LegendItem, LegendSeparator } from './legend';

const meta = {
  title: 'Components/Legend',
  component: Legend,
  parameters: { layout: 'padded' },
} satisfies Meta<typeof Legend>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <Legend>
      <LegendItem indicator={<Swatch color="chart-pos" />}>POS Revenue</LegendItem>
      <LegendItem indicator={<Swatch color="chart-eatclub" />}>Eatclub Revenue</LegendItem>
      <LegendItem indicator={<Swatch color="chart-labour" />} inactive>
        Labour Costs
      </LegendItem>
      <LegendSeparator />
      <LegendItem indicator={<TrendingUpIcon aria-hidden className="size-4 text-positive" />}>
        Positive Event Impact
      </LegendItem>
      <LegendItem indicator={<TrendingDownIcon aria-hidden className="size-4 text-negative" />}>
        Negative Event Impact
      </LegendItem>
    </Legend>
  ),
};
