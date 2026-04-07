import { CurrencyPipe, DatePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AbstractControl, FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { finalize } from 'rxjs';
import { AuthApiService, AuthResponse, LoginPayload, RegisterPayload } from '../core/auth-api.service';
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
  readonly editingProductId = signal<string | null>(null);
  readonly deletingProductId = signal<string | null>(null);
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
  readonly isEditingProduct = computed(() => this.editingProductId() !== null);
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

    return currentOrders.reduce((sum, order) => sum + order.totalPrice, 0) / currentOrders.length;
  });
  readonly selectedProduct = computed(() => {
    const selectedId = this.orderForm.controls.productId.value;
    return this.products().find(product => product.id === selectedId) ?? null;
  });
  readonly orderPreviewTotal = computed(() => {
    const product = this.selectedProduct();
    return product ? product.price * this.orderForm.controls.quantity.value : 0;
  });
  readonly premiumProduct = computed(() => {
    const currentProducts = this.products();
    return [...currentProducts].sort((left, right) => right.price - left.price)[0] ?? null;
  });
  readonly productBeingEdited = computed(() => {
    const productId = this.editingProductId();
    return this.products().find(product => product.id === productId) ?? null;
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
  readonly serviceHealth = computed(() => [
    {
      label: 'Autenticacion',
      state: this.authError() ? 'Atencion' : this.isAuthenticated() ? 'Operativo' : 'Disponible',
      tone: this.authError() ? 'danger' : this.isAuthenticated() ? 'success' : 'neutral'
    },
    {
      label: 'Catalogo',
      state: this.productError() ? 'Atencion' : this.products().length ? 'Operativo' : 'Sin datos',
      tone: this.productError() ? 'danger' : this.products().length ? 'success' : 'neutral'
    },
    {
      label: 'Pedidos',
      state: this.orderError() ? 'Atencion' : this.orders().length ? 'Operativo' : 'Disponible',
      tone: this.orderError() ? 'danger' : this.orders().length ? 'success' : 'neutral'
    }
  ]);

  readonly experienceBadges = [
    { value: '01', label: 'autenticacion, catalogo y pedidos en un mismo flujo' },
    { value: '02', label: 'CRUD real para el catalogo con refresco de datos' },
    { value: '03', label: 'validaciones sincronizadas entre frontend y backend' }
  ];
  readonly trustPoints = [
    'Los formularios muestran errores reales del backend y validaciones antes de enviar.',
    'El catalogo ya permite crear, editar, eliminar y refrescar referencias.',
    'Los pedidos reservan stock para evitar operaciones incoherentes en la plataforma.'
  ];
  readonly architecturePoints = [
    'Gateway unico para auth-service, product-service y order-service.',
    'Angular standalone con signals para estado local y formularios reactivos.',
    'Microservicios con validacion consistente y persistencia separada.'
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

    this.api
      .getProducts()
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.isLoadingProducts.set(false))
      )
      .subscribe({
        next: products => {
          this.products.set(products);
          this.ensureSelectedProduct(products);
        },
        error: error => {
          this.productError.set(this.getErrorMessage(error, 'No fue posible cargar el catalogo.'));
        }
      });
  }

  loadOrders(): void {
    this.orderError.set('');
    this.isLoadingOrders.set(true);

    this.api
      .getOrders()
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

    this.authApi
      .register(payload)
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

    this.authApi
      .login(payload)
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

  startProductEdition(product: Product): void {
    this.editingProductId.set(product.id);
    this.productError.set('');
    this.productSuccess.set('');
    this.productForm.reset({
      name: product.name,
      description: product.description,
      price: product.price,
      availableStock: product.availableStock
    });
  }

  cancelProductEdition(): void {
    this.editingProductId.set(null);
    this.resetProductForm();
    this.productError.set('');
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
    const editingProductId = this.editingProductId();
    const request$ = editingProductId
      ? this.api.updateProduct(editingProductId, payload)
      : this.api.createProduct(payload);

    request$
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.isSubmittingProduct.set(false))
      )
      .subscribe({
        next: product => {
          this.products.update(items => {
            if (!editingProductId) {
              return [product, ...items];
            }

            return items.map(item => (item.id === product.id ? product : item));
          });
          this.ensureSelectedProduct(this.products());
          this.productSuccess.set(
            editingProductId ? 'Producto actualizado correctamente.' : 'Producto agregado al catalogo.'
          );
          this.cancelProductEdition();
        },
        error: error => {
          this.productError.set(
            this.getErrorMessage(
              error,
              editingProductId ? 'No fue posible actualizar el producto.' : 'No fue posible registrar el producto.'
            )
          );
        }
      });
  }

  deleteProduct(product: Product): void {
    this.productError.set('');
    this.productSuccess.set('');
    this.deletingProductId.set(product.id);

    this.api
      .deleteProduct(product.id)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.deletingProductId.set(null))
      )
      .subscribe({
        next: () => {
          this.products.update(items => items.filter(item => item.id !== product.id));
          if (this.editingProductId() === product.id) {
            this.cancelProductEdition();
          }
          this.ensureSelectedProduct(this.products());
          this.productSuccess.set('Producto eliminado del catalogo.');
        },
        error: error => {
          this.productError.set(this.getErrorMessage(error, 'No fue posible eliminar el producto.'));
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

    const selectedProduct = this.selectedProduct();
    if (!selectedProduct) {
      this.orderError.set('Selecciona un producto valido antes de continuar.');
      return;
    }

    if (this.orderForm.controls.quantity.value > selectedProduct.availableStock) {
      this.orderError.set('La cantidad solicitada supera el stock disponible.');
      return;
    }

    this.orderError.set('');
    this.orderSuccess.set('');
    this.isSubmittingOrder.set(true);

    const payload = this.orderForm.getRawValue() as CreateOrderPayload;

    this.api
      .createOrder(payload)
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
          this.orderSuccess.set('Pedido creado y stock actualizado.');
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

  private ensureSelectedProduct(products: Product[]): void {
    const currentSelection = this.orderForm.controls.productId.value;
    const selectedExists = products.some(product => product.id === currentSelection);

    if (!selectedExists) {
      this.orderForm.patchValue({ productId: products[0]?.id ?? '' });
    }
  }

  private resetProductForm(): void {
    this.productForm.reset({
      name: '',
      description: '',
      price: 0,
      availableStock: 1
    });
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
