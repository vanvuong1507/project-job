import { InitSchema1792135603519 } from './1792135603519-InitSchema.js';
import { AddAdminRole1792136152466 } from './1792136152466-AddAdminRole.js';
import { AddAuthSessions1792167355713 } from './1792167355713-AddAuthSessions.js';

/**
 * Every migration, in order. Listed explicitly (not globbed) so they load the same way from `dist`
 * (CLI, server) and from TypeScript source (Vitest). Add each new migration class here.
 */
export const migrations = [
  InitSchema1792135603519,
  AddAdminRole1792136152466,
  AddAuthSessions1792167355713,
];
