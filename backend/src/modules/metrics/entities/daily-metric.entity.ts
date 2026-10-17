import {
  Check,
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { numericTransformer } from '../../../database/utils/numeric.transformer.js';

/** `daily_metrics` — one row per calendar day (spec §1.1). Serialised as-is by the admin API. */
@Entity({ name: 'daily_metrics' })
@Check('CHK_daily_metrics_pos_revenue', '"pos_revenue" >= 0')
@Check('CHK_daily_metrics_eatclub_revenue', '"eatclub_revenue" >= 0')
@Check('CHK_daily_metrics_labour_cost', '"labour_cost" >= 0')
@Check('CHK_daily_metrics_covers', '"covers" >= 0')
export class DailyMetricEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /** `YYYY-MM-DD` */
  @Column({ type: 'date', unique: true })
  date: string;

  @Column({
    name: 'pos_revenue',
    type: 'numeric',
    precision: 12,
    scale: 2,
    default: 0,
    transformer: numericTransformer,
  })
  posRevenue: number;

  @Column({
    name: 'eatclub_revenue',
    type: 'numeric',
    precision: 12,
    scale: 2,
    default: 0,
    transformer: numericTransformer,
  })
  eatclubRevenue: number;

  @Column({
    name: 'labour_cost',
    type: 'numeric',
    precision: 12,
    scale: 2,
    default: 0,
    transformer: numericTransformer,
  })
  labourCost: number;

  @Column({ type: 'integer', default: 0 })
  covers: number;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
