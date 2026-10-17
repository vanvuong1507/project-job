/** Admin endpoints — docs/US-TASK-DETAIL.md §1.2. */
import type { DayEvent, DayMetrics } from './dashboard';

/** Admin roles (RBAC): ADMIN has every permission, VIEWER is read-only. */
export type Role = 'ADMIN' | 'VIEWER';

export interface AdminUser {
  id: string;
  email: string;
  name: string;
  role: Role;
}

export interface DailyMetric extends DayMetrics {
  id: string;
  date: string;
}

export interface EventImpact extends DayEvent {
  id: string;
  date: string;
}
