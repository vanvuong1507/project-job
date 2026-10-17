import {
  Check,
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { AdminUserEntity } from './admin-user.entity.js';

export const REVOKE_REASONS = ['logout', 'reuse', 'expired'] as const;
export type RevokeReason = (typeof REVOKE_REASONS)[number];

/**
 * `auth_sessions` — one row per sign-in (a refresh-token family). The refresh token itself is not
 * stored: it is `<id>.<generation>.<HMAC>` and only the current `generation` is kept, so a database
 * leak exposes no usable token. Each refresh bumps `generation` (rotation); presenting an older
 * generation (outside the reuse leeway) revokes the whole session. Access tokens carry the session
 * id (`sid`), so a revoked session stops them immediately too.
 */
@Entity({ name: 'auth_sessions' })
@Index('IDX_auth_sessions_user_id', ['userId'])
@Check('CHK_auth_sessions_generation', '"generation" >= 0')
@Check(
  'CHK_auth_sessions_revoked_reason',
  `"revoked_reason" IS NULL OR "revoked_reason" IN ('logout', 'reuse', 'expired')`,
)
export class AuthSessionEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  @ManyToOne(() => AdminUserEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id', foreignKeyConstraintName: 'FK_auth_sessions_user_id' })
  user?: AdminUserEntity;

  /** Generation of the only refresh token currently valid (starts at 0). */
  @Column({ type: 'integer', default: 0 })
  generation: number;

  /** When `generation` last changed: the previous token stays valid for the reuse leeway after it. */
  @Column({ name: 'rotated_at', type: 'timestamptz', nullable: true })
  rotatedAt: Date | null;

  /** Sliding expiry: extended on every refresh, never beyond `absoluteExpiresAt`. */
  @Column({ name: 'expires_at', type: 'timestamptz' })
  expiresAt: Date;

  /** Hard limit counted from sign-in (SESSION_MAX_DAYS). */
  @Column({ name: 'absolute_expires_at', type: 'timestamptz' })
  absoluteExpiresAt: Date;

  @Column({ name: 'revoked_at', type: 'timestamptz', nullable: true })
  revokedAt: Date | null;

  @Column({ name: 'revoked_reason', type: 'varchar', length: 16, nullable: true })
  revokedReason: RevokeReason | null;

  /** Audit: where the session was last used from. */
  @Column({ name: 'last_ip', type: 'varchar', length: 64, nullable: true })
  lastIp: string | null;

  @Column({ name: 'user_agent', type: 'varchar', length: 255, nullable: true })
  userAgent: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
