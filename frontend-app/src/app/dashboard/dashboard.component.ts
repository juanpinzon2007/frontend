import { CurrencyPipe, DatePipe } from '@angular/common';
import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AbstractControl } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { finalize } from 'rxjs';
import {
  AuthApiService,
  AuthResponse,
  LoginPayload,
  RegisterPayload
} from '../core/auth-api.service';
import { AuthSessionService } from '../core/auth-session.service';
import {
  CreateOrderPayload,
  CreateProductPayload,
  Order,
  Product,
  StoreApiService
} from '../core/store-api.service';

type AuthMode = 'login' | 'register';
type FormGroupName = 'product' | 'order' | 'login' | 'register';
type ProductSort = 'featured' | 'price-desc' | 'price-asc' | 'stock-desc';

const STRICT_EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

@Component({
  selector: 'app-dashboard',
  imports: [ReactiveFormsModule, CurrencyPipe, DatePipe],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss'
})
export class DashboardComponent {
  private readonly api = inject(StoreApiService);
  private readonly authApi = inject(AuthApiService);
  private readonly authSession = inject(AuthSessionService);
  private readonly formBuilder = inject(FormBuilder);
  private readonly destroyRef = inject(DestroyRef);

  readonly authMode = signal<AuthMode>('login');
  readonly isMobileMenuOpen = signal(false);
  readonly catalogQuery = signal('');
  readonly catalogSort = signal<ProductSort>('featured');
  readonly products = signal<Product[]>([]);
  readonly orders = signal<Order[]>([]);
  readonly isLoadingProducts = signal(false);
  readonly isLoadingOrders = signal(false);
  readonly isSubmittingProduct = signal(false);
  readonly isSubmittingOrder = signal(false);
  readonly isSubmittingAuth = signal(false);
  readonly productError = signal('');
  readonly orderError = signal('');
  readonly authError = signal('');
  readonly productSuccess = signal('');
  readonly orderSuccess = signal('');
  readonly authSuccess = signal('');

  readonly currentUser = this.authSession.currentUser;
  readonly isAuthenticated = computed(() => this.currentUser() !== null);
  readonly totalInventory = computed(() => this.products().reduce((sum, item) => sum + item.availableStock, 0));
  readonly inventoryValue = computed(() =>
    this.products().reduce((sum, item) => sum + item.price * item.availableStock, 0)
  );
  readonly lowStockProducts = computed(() => this.products().filter(product => product.availableStock <= 5));
  readonly totalRevenue = computed(() => this.orders().reduce((sum, order) => sum + order.totalPrice, 0));
  readonly averageTicket = computed(() => {
    const currentOrders = this.orders();
    if (!currentOrders.length) {
      return 0;
    }

    const total = currentOrders.reduce((sum, order) => sum + order.totalPrice, 0);
    return total / currentOrders.length;
  });
  readonly selectedProduct = computed(() => {
    const selectedId = this.orderForm.controls.productId.value;
    return this.products().find(product => product.id === selectedId) ?? null;
  });
  readonly orderPreviewTotal = computed(() => {
    const selected = this.selectedProduct();
    const quantity = this.orderForm.controls.quantity.value;
    return selected ? selected.price * quantity : 0;
  });
  readonly premiumProduct = computed(() => {
    const currentProducts = this.products();
    return [...currentProducts].sort((left, right) => right.price - left.price)[0] ?? null;
  });
  readonly filteredProducts = computed(() => {
    const query = this.catalogQuery().trim().toLowerCase();
    const sorted = [...this.products()];

    switch (this.catalogSort()) {
      case 'price-desc':
        sorted.sort((left, right) => right.price - left.price);
        break;
      case 'price-asc':
        sorted.sort((left, right) => left.price - right.price);
        break;
      case 'stock-desc':
        sorted.sort((left, right) => right.availableStock - left.availableStock);
        break;
      default:
        sorted.sort((left, right) => {
          if (right.availableStock !== left.availableStock) {
            return right.availableStock - left.availableStock;
          }

          return right.price - left.price;
        });
        break;
    }

    if (!query) {
      return sorted;
    }

    return sorted.filter(product =>
      [product.name, product.description].some(value => value.toLowerCase().includes(query))
    );
  });
  readonly recentOrders = computed(() =>
    [...this.orders()]
      .sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime())
      .slice(0, 6)
  );
  readonly experienceBadges = [
    { value: '01', label: 'design system consistente para flujos de negocio' },
    { value: '02', label: 'dashboard, formularios y catalogo con lectura clara' },
    { value: '03', label: 'interfaz premium sin afectar servicios ni validaciones' }
  ];
  readonly trustPoints = [
    'Botones, cards e inputs comparten alturas, radios, sombras y estados visuales reutilizables.',
    'La navegacion lateral y la jerarquia de paneles reducen ruido visual y aceleran la lectura.',
    'La UI conserva la funcionalidad existente porque el rediseño se limita a estructura y estilos.'
  ];
  readonly architecturePoints = [
    'Microservicios con persistencia independiente y gateway unico.',
    'Angular standalone con estado local via signals y servicios especializados.',
    'Autenticacion con persistencia propia, validacion y contraseñas cifradas.'
  ];

  readonly productForm = this.formBuilder.nonNullable.group({
    name: ['', [Validators.required, Validators.minLength(3)]],
    description: ['', [Validators.required, Validators.minLength(10)]],
    price: [0, [Validators.required, Validators.min(0.01)]],
    availableStock: [1, [Validators.required, Validators.min(1)]]
  });

  readonly orderForm = this.formBuilder.nonNullable.group({
    productId: ['', Validators.required],
    quantity: [1, [Validators.required, Validators.min(1)]],
    customerName: ['']
  });

  readonly loginForm = this.formBuilder.nonNullable.group({
    email: ['', [Validators.required, Validators.email, Validators.pattern(STRICT_EMAIL_PATTERN)]],
    password: ['', [Validators.required, Validators.minLength(8)]]
  });

  readonly registerForm = this.formBuilder.nonNullable.group({
    fullName: ['', [Validators.required, Validators.minLength(3)]],
    email: ['', [Validators.required, Validators.email, Validators.pattern(STRICT_EMAIL_PATTERN)]],
    password: [
      '',
      [Validators.required, Validators.minLength(8), Validators.pattern(/^(?=.*[A-Za-z])(?=.*\d).+$/)]
    ]
  });

  constructor() {
    this.syncOrderCustomerWithSession();
    this.loadProducts();
    this.loadOrders();
  }

  toggleMobileMenu(): void {
    this.isMobileMenuOpen.update(value => !value);
  }

  closeMobileMenu(): void {
    this.isMobileMenuOpen.set(false);
  }

  setAuthMode(mode: AuthMode): void {
    this.authMode.set(mode);
    this.authError.set('');
    this.authSuccess.set('');
  }

  loadProducts(): void {
    this.productError.set('');
    this.isLoadingProducts.set(true);
    this.api.getProducts()
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.isLoadingProducts.set(false))
      )
      .subscribe({
        next: products => {
          this.products.set(products);

          if (!this.orderForm.controls.productId.value && products.length > 0) {
            this.orderForm.patchValue({ productId: products[0].id });
          }
        },
        error: error => {
          this.productError.set(this.getErrorMessage(error, 'No fue posible cargar el catalogo.'));
        }
      });
  }

  loadOrders(): void {
    this.orderError.set('');
    this.isLoadingOrders.set(true);
    this.api.getOrders()
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.isLoadingOrders.set(false))
      )
      .subscribe({
        next: orders => this.orders.set(orders),
        error: error => {
          this.orderError.set(this.getErrorMessage(error, 'No fue posible cargar los pedidos.'));
        }
      });
  }

  submitRegister(): void {
    if (this.registerForm.invalid) {
      this.registerForm.markAllAsTouched();
      return;
    }

    this.authError.set('');
    this.authSuccess.set('');
    this.isSubmittingAuth.set(true);

    const payload = this.registerForm.getRawValue() as RegisterPayload;

    this.authApi.register(payload)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.isSubmittingAuth.set(false))
      )
      .subscribe({
        next: response => {
          this.applySession(response, 'Cuenta creada e inicio de sesion completado.');
          this.registerForm.reset({ fullName: '', email: '', password: '' });
          this.loginForm.reset({ email: response.email, password: '' });
        },
        error: error => {
          this.authError.set(this.getErrorMessage(error, 'No fue posible crear la cuenta.'));
        }
      });
  }

  submitLogin(): void {
    if (this.loginForm.invalid) {
      this.loginForm.markAllAsTouched();
      return;
    }

    this.authError.set('');
    this.authSuccess.set('');
    this.isSubmittingAuth.set(true);

    const payload = this.loginForm.getRawValue() as LoginPayload;

    this.authApi.login(payload)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.isSubmittingAuth.set(false))
      )
      .subscribe({
        next: response => {
          this.applySession(response, 'Sesion iniciada correctamente.');
          this.loginForm.reset({ email: response.email, password: '' });
        },
        error: error => {
          this.authError.set(this.getErrorMessage(error, 'No fue posible iniciar sesion.'));
        }
      });
  }

  logout(): void {
    this.authSession.clearSession();
    this.orderForm.patchValue({ customerName: '' });
    this.authSuccess.set('Sesion cerrada correctamente.');
    this.authError.set('');
  }

  setCatalogQuery(query: string): void {
    this.catalogQuery.set(query);
  }

  setCatalogSort(sort: ProductSort): void {
    this.catalogSort.set(sort);
  }

  submitProduct(): void {
    if (this.productForm.invalid) {
      this.productForm.markAllAsTouched();
      return;
    }

    this.productError.set('');
    this.productSuccess.set('');
    this.isSubmittingProduct.set(true);

    const payload = this.productForm.getRawValue() as CreateProductPayload;

    this.api.createProduct(payload)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.isSubmittingProduct.set(false))
      )
      .subscribe({
        next: product => {
          this.products.update(items => [product, ...items]);
          this.productForm.reset({ name: '', description: '', price: 0, availableStock: 1 });
          this.productSuccess.set('Producto agregado al catalogo.');

          if (!this.orderForm.controls.productId.value) {
            this.orderForm.patchValue({ productId: product.id });
          }
        },
        error: error => {
          this.productError.set(this.getErrorMessage(error, 'No fue posible registrar el producto.'));
        }
      });
  }

  submitOrder(): void {
    if (!this.isAuthenticated()) {
      this.orderError.set('Debes iniciar sesion para registrar un pedido.');
      this.authMode.set('login');
      return;
    }

    if (this.orderForm.invalid) {
      this.orderForm.markAllAsTouched();
      return;
    }

    this.orderError.set('');
    this.orderSuccess.set('');
    this.isSubmittingOrder.set(true);

    const payload = this.orderForm.getRawValue() as CreateOrderPayload;

    this.api.createOrder(payload)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.isSubmittingOrder.set(false))
      )
      .subscribe({
        next: order => {
          this.orders.update(items => [order, ...items]);
          this.orderForm.patchValue({
            quantity: 1,
            customerName: this.currentUser()?.fullName ?? ''
          });
          this.orderSuccess.set('Pedido creado y registrado en el backend.');
          this.loadProducts();
        },
        error: error => {
          this.orderError.set(this.getErrorMessage(error, 'No fue posible crear el pedido.'));
        }
      });
  }

  hasFieldError(formName: FormGroupName, controlName: string): boolean {
    const form = {
      product: this.productForm,
      order: this.orderForm,
      login: this.loginForm,
      register: this.registerForm
    }[formName];

    const control = form.controls[controlName as keyof typeof form.controls] as AbstractControl | undefined;
    return !!control && control.invalid && (control.touched || control.dirty);
  }

  private applySession(response: AuthResponse, successMessage: string): void {
    this.authSession.setSession(response);
    this.orderForm.patchValue({ customerName: response.fullName });
    this.authSuccess.set(successMessage);
    this.authError.set('');
  }

  private syncOrderCustomerWithSession(): void {
    const user = this.currentUser();
    if (user) {
      this.orderForm.patchValue({ customerName: user.fullName });
    }
  }

  private getErrorMessage(error: unknown, fallbackMessage: string): string {
    if (error instanceof HttpErrorResponse) {
      if (error.status === 0) {
        return 'No hubo conexion con el backend. Revisa el despliegue del gateway o la configuracion de /api.';
      }

      const apiError = error.error as { message?: string; details?: string[] } | null;
      if (apiError?.details?.length) {
        return apiError.details.join(' | ');
      }

      if (apiError?.message) {
        return apiError.message;
      }
    }

    return fallbackMessage;
  }
}
