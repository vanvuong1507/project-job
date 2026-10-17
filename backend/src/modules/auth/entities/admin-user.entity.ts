import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { ROLES, type Role } from '../permissions.js';

/** `admin_users` — accounts that can sign in to the admin app (role ADMIN or VIEWER). Emails are stored lower-cased. */
@Entity({ name: 'admin_users' })
export class AdminUserEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 254, unique: true })
  email: string;

  @Column({ name: 'password_hash', type: 'varchar', length: 255 })
  passwordHash: string;

  @Column({ type: 'varchar', length: 120 })
  name: string;

  @Column({ type: 'enum', enum: ROLES, enumName: 'admin_role', default: 'ADMIN' })
  role: Role;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
