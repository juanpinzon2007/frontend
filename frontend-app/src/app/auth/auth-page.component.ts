import { HttpErrorResponse } from '@angular/common/http';
import { Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AbstractControl, FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { finalize } from 'rxjs';
import { AuthApiService, LoginPayload, RegisterPayload } from '../core/auth-api.service';
import { AuthSessionService } from '../core/auth-session.service';
import { USER_ROLES, UserRole } from '../core/auth.models';

type AuthMode = 'login' | 'register';
type AuthFormGroupName = 'login' | 'register';

const STRICT_EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

@Component({
  selector: 'app-auth-page',
  imports: [ReactiveFormsModule],
  templateUrl: './auth-page.component.html',
  styleUrl: './auth-page.component.scss'
})
export class AuthPageComponent {
  private readonly authApi = inject(AuthApiService);
  private readonly authSession = inject(AuthSessionService);
  private readonly router = inject(Router);
  private readonly formBuilder = inject(FormBuilder);
  private readonly destroyRef = inject(DestroyRef);

  readonly authMode = signal<AuthMode>('login');
  readonly isSubmitting = signal(false);
  readonly authError = signal('');

  readonly availableRoles = USER_ROLES;
  readonly roleDescriptions: Record<UserRole, string> = {
    ADMIN: 'Acceso completo: equipo, configuraciones y operacion.',
    OPERATIONS: 'Gestion operativa: catalogo, inventario y pedidos.',
    ANALYST: 'Vista analitica: indicadores, trazabilidad y reportes.',
    USER: 'Usuario comercial: consulta catalogo y crea pedidos.'
  };

  readonly loginForm = this.formBuilder.nonNullable.group({
    email: ['', [Validators.required, Validators.email, Validators.pattern(STRICT_EMAIL_PATTERN)]],
    password: ['', [Validators.required, Validators.minLength(8)]],
    role: ['ANALYST' as UserRole, Validators.required]
  });

  readonly registerForm = this.formBuilder.nonNullable.group({
    fullName: ['', [Validators.required, Validators.minLength(3)]],
    email: ['', [Validators.required, Validators.email, Validators.pattern(STRICT_EMAIL_PATTERN)]],
    password: [
      '',
      [Validators.required, Validators.minLength(8), Validators.pattern(/^(?=.*[A-Za-z])(?=.*\d).+$/)]
    ],
    role: ['USER' as UserRole, Validators.required]
  });

  setAuthMode(mode: AuthMode): void {
    this.authMode.set(mode);
    this.authError.set('');
  }

  submitLogin(): void {
    if (this.loginForm.invalid) {
      this.loginForm.markAllAsTouched();
      return;
    }

    this.authError.set('');
    this.isSubmitting.set(true);

    const { email, password, role } = this.loginForm.getRawValue();
    const payload: LoginPayload = { email, password };

    this.authApi
      .login(payload)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.isSubmitting.set(false))
      )
      .subscribe({
        next: response => {
          this.authSession.setSession(response, role);
          void this.router.navigate(['/workspace']);
        },
        error: error => {
          this.authError.set(this.getErrorMessage(error, 'No fue posible iniciar sesion.'));
        }
      });
  }

  submitRegister(): void {
    if (this.registerForm.invalid) {
      this.registerForm.markAllAsTouched();
      return;
    }

    this.authError.set('');
    this.isSubmitting.set(true);

    const { fullName, email, password, role } = this.registerForm.getRawValue();
    const payload: RegisterPayload = { fullName, email, password };

    this.authApi
      .register(payload)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.isSubmitting.set(false))
      )
      .subscribe({
        next: response => {
          this.authSession.setSession(response, role);
          void this.router.navigate(['/workspace']);
        },
        error: error => {
          this.authError.set(this.getErrorMessage(error, 'No fue posible registrar la cuenta.'));
        }
      });
  }

  hasFieldError(formName: AuthFormGroupName, controlName: string): boolean {
    const form = {
      login: this.loginForm,
      register: this.registerForm
    }[formName];

    const control = form.controls[controlName as keyof typeof form.controls] as AbstractControl | undefined;
    return !!control && control.invalid && (control.touched || control.dirty);
  }

  private getErrorMessage(error: unknown, fallbackMessage: string): string {
    if (error instanceof HttpErrorResponse) {
      if (error.status === 0) {
        return 'No hubo conexion con el backend. Revisa el gateway y la configuracion de /api.';
      }

      const apiError = error.error as { message?: string; details?: string[] } | string | null;
      if (typeof apiError === 'string' && apiError.trim()) {
        return apiError;
      }

      if (apiError && typeof apiError === 'object') {
        if (Array.isArray(apiError.details) && apiError.details.length) {
          return apiError.details.join(' | ');
        }

        if (apiError.message) {
          return apiError.message;
        }
      }
    }

    return fallbackMessage;
  }
}
