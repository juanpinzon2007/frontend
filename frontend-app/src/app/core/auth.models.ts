import { AuthResponse } from './auth-api.service';

export const USER_ROLES = ['ADMIN', 'OPERATIONS', 'ANALYST', 'USER'] as const;

export type UserRole = (typeof USER_ROLES)[number];

export interface SessionUser extends AuthResponse {
  role: UserRole;
}

export function isUserRole(value: unknown): value is UserRole {
  return typeof value === 'string' && (USER_ROLES as readonly string[]).includes(value);
}
