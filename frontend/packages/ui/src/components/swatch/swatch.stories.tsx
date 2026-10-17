import type { Meta, StoryObj } from '@storybook/react-vite';
import { COLOR_TOKENS } from '../../theme/tokens';
import { Swatch } from './swatch';

const meta = {
  title: 'Components/Swatch',
  component: Swatch,
  args: { color: 'chart-eatclub', shape: 'dot' },
  argTypes: {
    color: { control: 'select', options: COLOR_TOKENS },
    shape: { control: 'inline-radio', options: ['dot', 'square', 'line'] },
  },
} satisfies Meta<typeof Swatch>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Dot: Story = {};
export const Line: Story = { args: { shape: 'line', color: 'chart-labour' } };

export const ChartPalette: Story = {
  render: () => (
    <div className="grid grid-cols-3 gap-3 text-sm">
      {COLOR_TOKENS.filter((token) => token.startsWith('chart-')).map((token) => (
        <span key={token} className="inline-flex items-center gap-2">
          <Swatch color={token} shape="square" className="size-5" />
          {token}
        </span>
      ))}
    </div>
  ),
};
