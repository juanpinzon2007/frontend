import { Injectable, computed, signal } from '@angular/core';
import { AuthResponse } from './auth-api.service';
import { SessionUser, UserRole, isUserRole } from './auth.models';

const SESSION_STORAGE_KEY = 'storefront.auth.session';
const ROLE_DIRECTORY_STORAGE_KEY = 'storefront.auth.role-directory';
const DEFAULT_ROLE: UserRole = 'ANALYST';

@Injectable({ providedIn: 'root' })
export class AuthSessionService {
  readonly currentUser = signal<SessionUser | null>(this.readStoredSession());
  readonly isAuthenticated = computed(() => this.currentUser() !== null);

  setSession(session: AuthResponse, requestedRole?: UserRole): SessionUser {
    const role = requestedRole ?? this.resolveRoleForEmail(session.email);
    this.persistRoleForEmail(session.email, role);

    const nextSession: SessionUser = { ...session, role };
    this.currentUser.set(nextSession);
    this.storage()?.setItem(SESSION_STORAGE_KEY, JSON.stringify(nextSession));
    return nextSession;
  }

  clearSession(): void {
    this.currentUser.set(null);
    this.storage()?.removeItem(SESSION_STORAGE_KEY);
  }

  persistRoleForEmail(email: string, role: UserRole): void {
    const directory = this.readRoleDirectory();
    directory[this.normalizeEmail(email)] = role;
    this.storage()?.setItem(ROLE_DIRECTORY_STORAGE_KEY, JSON.stringify(directory));
  }

  resolveRoleForEmail(email: string): UserRole {
    const role = this.readRoleDirectory()[this.normalizeEmail(email)];
    return isUserRole(role) ? role : DEFAULT_ROLE;
  }

  private readStoredSession(): SessionUser | null {
    const rawValue = this.storage()?.getItem(SESSION_STORAGE_KEY);
    if (!rawValue) {
      return null;
    }

    try {
      const parsed = JSON.parse(rawValue) as AuthResponse & { role?: unknown };
      const role = isUserRole(parsed.role) ? parsed.role : this.resolveRoleForEmail(parsed.email);
      const hydratedSession: SessionUser = {
        userId: parsed.userId,
        fullName: parsed.fullName,
        email: parsed.email,
        token: parsed.token,
        authenticatedAt: parsed.authenticatedAt,
        role
      };
      this.persistRoleForEmail(hydratedSession.email, hydratedSession.role);
      this.storage()?.setItem(SESSION_STORAGE_KEY, JSON.stringify(hydratedSession));
      return hydratedSession;
    } catch {
      this.storage()?.removeItem(SESSION_STORAGE_KEY);
      return null;
    }
  }

  private readRoleDirectory(): Record<string, UserRole> {
    const rawValue = this.storage()?.getItem(ROLE_DIRECTORY_STORAGE_KEY);
    if (!rawValue) {
      return {};
    }

    try {
      const parsed = JSON.parse(rawValue) as Record<string, unknown>;
      return Object.entries(parsed).reduce<Record<string, UserRole>>((acc, [key, value]) => {
        if (isUserRole(value)) {
          acc[key] = value;
        }
        return acc;
      }, {});
    } catch {
      this.storage()?.removeItem(ROLE_DIRECTORY_STORAGE_KEY);
      return {};
    }
  }

  private normalizeEmail(email: string): string {
    return email.trim().toLowerCase();
  }

  private storage(): Storage | null {
    if (typeof globalThis === 'undefined' || !('localStorage' in globalThis)) {
      return null;
    }

    return globalThis.localStorage;
  }
}
