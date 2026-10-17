import { compare, hash, hashSync } from 'bcryptjs';

const COST = 10;

export function hashPassword(password: string): Promise<string> {
  return hash(password, COST);
}

export function verifyPassword(password: string, passwordHash: string): Promise<boolean> {
  return compare(password, passwordHash);
}

/** Compared against when the email is unknown, so both paths take the same time (no user enumeration). */
export const DUMMY_HASH = hashSync('timing-equaliser', COST);
