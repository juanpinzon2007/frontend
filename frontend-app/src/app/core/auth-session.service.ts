import { Injectable, signal } from '@angular/core';
import { AuthResponse } from './auth-api.service';

const SESSION_STORAGE_KEY = 'storefront.auth.session';

@Injectable({ providedIn: 'root' })
export class AuthSessionService {
  readonly currentUser = signal<AuthResponse | null>(this.readStoredSession());

  setSession(session: AuthResponse): void {
    this.currentUser.set(session);
    localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
  }

  clearSession(): void {
    this.currentUser.set(null);
    localStorage.removeItem(SESSION_STORAGE_KEY);
  }

  private readStoredSession(): AuthResponse | null {
    const rawValue = localStorage.getItem(SESSION_STORAGE_KEY);
    if (!rawValue) {
      return null;
    }

    try {
      return JSON.parse(rawValue) as AuthResponse;
    } catch {
      localStorage.removeItem(SESSION_STORAGE_KEY);
      return null;
    }
  }
}
