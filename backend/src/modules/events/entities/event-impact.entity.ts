import {
  Check,
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { IMPACT_TYPES, type ImpactType } from '../events.constants.js';

/** `event_impacts` — events shown as markers on the dashboard chart (spec §1.1). */
@Entity({ name: 'event_impacts' })
@Check('CHK_event_impacts_title_not_blank', `length(btrim("title")) > 0`)
export class EventImpactEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /** `YYYY-MM-DD` */
  @Index('IDX_event_impacts_date')
  @Column({ type: 'date' })
  date: string;

  @Column({ type: 'enum', enum: IMPACT_TYPES, enumName: 'event_impact_type' })
  impact: ImpactType;

  @Column({ type: 'varchar', length: 120 })
  title: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  description: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
