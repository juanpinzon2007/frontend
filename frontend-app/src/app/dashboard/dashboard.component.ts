import { CurrencyPipe, DatePipe, DecimalPipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, DestroyRef, computed, effect, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AbstractControl, FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { finalize } from 'rxjs';
import { AuthSessionService } from '../core/auth-session.service';
import { UserRole } from '../core/auth.models';
import {
  CreateOrderPayload,
  CreateProductPayload,
  Order,
  Product,
  StoreApiService
} from '../core/store-api.service';

type WorkspaceSection = 'overview' | 'catalog' | 'operations' | 'orders' | 'analytics' | 'team';
type FormGroupName = 'product' | 'order';
type ProductSort = 'featured' | 'price-desc' | 'price-asc' | 'stock-desc';

interface NavigationItem {
  id: WorkspaceSection;
  label: string;
  description: string;
  iconPath: string;
  roles: readonly UserRole[];
}

const NAVIGATION_ITEMS: readonly NavigationItem[] = [
  {
    id: 'overview',
    label: 'Resumen',
    description: 'Indicadores clave de la operacion comercial.',
    iconPath: 'M3 13h8V3H3v10Zm0 8h8v-6H3v6Zm10 0h8V11h-8v10Zm0-18v6h8V3h-8Z',
    roles: ['ADMIN', 'OPERATIONS', 'ANALYST', 'USER']
  },
  {
    id: 'catalog',
    label: 'Catalogo',
    description: 'Consulta y mantenimiento de referencias de producto.',
    iconPath: 'M4 4h16v4H4V4Zm0 6h10v10H4V10Zm12 0h4v4h-4v-4Zm0 6h4v4h-4v-4Z',
    roles: ['ADMIN', 'OPERATIONS', 'USER']
  },
  {
    id: 'operations',
    label: 'Operacion',
    description: 'Flujo de alta de productos y creacion de pedidos.',
    iconPath: 'M19 3h2v7h-2V3Zm-8 4h2v14h-2V7ZM3 11h2v10H3V11Zm8-8h2v2h-2V3Z',
    roles: ['ADMIN', 'OPERATIONS', 'USER']
  },
  {
    id: 'orders',
    label: 'Pedidos',
    description: 'Seguimiento de pedidos recientes y estados.',
    iconPath: 'M7 3h10l4 4v14H3V3h4Zm8 2H9v4h6V5Zm2 12H7v2h10v-2Zm0-4H7v2h10v-2Z',
    roles: ['ADMIN', 'OPERATIONS', 'ANALYST', 'USER']
  },
  {
    id: 'analytics',
    label: 'Analitica',
    description: 'Rentabilidad, ticket promedio y trazabilidad.',
    iconPath: 'M3 19h18v2H1V3h2v16Zm4-6h3v6H7v-6Zm5-4h3v10h-3V9Zm5-5h3v15h-3V4Z',
    roles: ['ADMIN', 'OPERATIONS', 'ANALYST']
  },
  {
    id: 'team',
    label: 'Equipo',
    description: 'Controles de perfil, cumplimiento y seguridad.',
    iconPath: 'M7 11a4 4 0 1 1 0-8 4 4 0 0 1 0 8Zm10 1a3 3 0 1 1 0-6 3 3 0 0 1 0 6ZM2 21v-2a5 5 0 0 1 5-5h1a5 5 0 0 1 5 5v2H2Zm12 0v-1a4 4 0 0 1 4-4 4 4 0 0 1 4 4v1h-8Z',
    roles: ['ADMIN']
  }
];

const ROLE_LABEL: Record<UserRole, string> = {
  ADMIN: 'Administrador',
  OPERATIONS: 'Operaciones',
  ANALYST: 'Analista',
  USER: 'Usuario'
};

const SECTION_HEADLINES: Record<WorkspaceSection, { title: string; description: string }> = {
  overview: {
    title: 'Centro de control comercial',
    description: 'Monitorea inventario, revenue y salud operativa en tiempo real.'
  },
  catalog: {
    title: 'Gestion de catalogo',
    description: 'Consulta inventario, filtra productos y ejecuta mantenimiento seguro.'
  },
  operations: {
    title: 'Operacion de negocio',
    description: 'Registra productos y pedidos sincronizando stock contra backend.'
  },
  orders: {
    title: 'Seguimiento de pedidos',
    description: 'Revisa flujo transaccional y estados de orden para control diario.'
  },
  analytics: {
    title: 'Analitica empresarial',
    description: 'Evalua ticket promedio, clientes frecuentes y referencias de mayor impacto.'
  },
  team: {
    title: 'Administracion de equipo',
    description: 'Visibilidad de perfiles, cumplimiento y practicas de seguridad.'
  }
};

@Component({
  selector: 'app-dashboard',
  imports: [ReactiveFormsModule, CurrencyPipe, DatePipe, DecimalPipe],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss'
})
export class DashboardComponent {
  private readonly api = inject(StoreApiService);
  private readonly authSession = inject(AuthSessionService);
  private readonly formBuilder = inject(FormBuilder);
  private readonly destroyRef = inject(DestroyRef);
  private readonly router = inject(Router);

  readonly currentUser = this.authSession.currentUser;
  readonly isAuthenticated = this.authSession.isAuthenticated;
  readonly currentRole = computed<UserRole>(() => this.currentUser()?.role ?? 'ANALYST');
  readonly roleLabel = computed(() => ROLE_LABEL[this.currentRole()]);
  readonly isMobileMenuOpen = signal(false);
  readonly activeSection = signal<WorkspaceSection>('overview');

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

  readonly productError = signal('');
  readonly orderError = signal('');
  readonly productSuccess = signal('');
  readonly orderSuccess = signal('');

  readonly teamMembers = [
    { name: 'Maria Rojas', role: 'Product Owner', area: 'Comercial', status: 'Activo' },
    { name: 'Daniel Suarez', role: 'Ops Lead', area: 'Inventario', status: 'Activo' },
    { name: 'Andres Pineda', role: 'Finance Analyst', area: 'Analitica', status: 'En revision' }
  ];

  readonly governanceChecklist = [
    'Control de sesiones con cierre seguro por perfil.',
    'Permisos por rol para evitar operaciones no autorizadas.',
    'Trazabilidad de pedidos y validaciones de stock previas.'
  ];

  readonly navigationItems = computed(() =>
    NAVIGATION_ITEMS.filter(item => item.roles.includes(this.currentRole()))
  );
  readonly activeSectionMeta = computed(() => SECTION_HEADLINES[this.activeSection()]);

  readonly canManageCatalog = computed(
    () => this.currentRole() === 'ADMIN' || this.currentRole() === 'OPERATIONS'
  );
  readonly canManageOrders = computed(
    () =>
      this.currentRole() === 'ADMIN' ||
      this.currentRole() === 'OPERATIONS' ||
      this.currentRole() === 'USER'
  );
  readonly canViewTeamPanel = computed(() => this.currentRole() === 'ADMIN');

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
      .slice(0, 8)
  );

  readonly topProducts = computed(() =>
    [...this.products()]
      .sort((left, right) => right.price * right.availableStock - left.price * left.availableStock)
      .slice(0, 5)
  );

  readonly topCustomers = computed(() => {
    const customerMap = this.orders().reduce<Map<string, number>>((acc, order) => {
      const key = order.customerName?.trim() || 'Cliente general';
      acc.set(key, (acc.get(key) ?? 0) + order.totalPrice);
      return acc;
    }, new Map<string, number>());

    return [...customerMap.entries()]
      .map(([customer, total]) => ({ customer, total }))
      .sort((left, right) => right.total - left.total)
      .slice(0, 5);
  });

  readonly ordersByStatus = computed(() => {
    const statusMap = this.orders().reduce<Map<string, number>>((acc, order) => {
      const key = order.status || 'Sin estado';
      acc.set(key, (acc.get(key) ?? 0) + 1);
      return acc;
    }, new Map<string, number>());

    return [...statusMap.entries()].map(([status, total]) => ({ status, total }));
  });

  readonly productForm = this.formBuilder.nonNullable.group({
    name: ['', [Validators.required, Validators.minLength(3)]],
    description: ['', [Validators.required, Validators.minLength(10)]],
    price: [0, [Validators.required, Validators.min(0.01)]],
    availableStock: [1, [Validators.required, Validators.min(1)]]
  });

  readonly orderForm = this.formBuilder.nonNullable.group({
    productId: ['', Validators.required],
    quantity: [1, [Validators.required, Validators.min(1)]],
    customerName: ['', [Validators.required, Validators.minLength(2)]]
  });

  constructor() {
    this.loadProducts();
    this.loadOrders();

    effect(() => {
      const user = this.currentUser();
      this.orderForm.patchValue({ customerName: user?.fullName ?? '' }, { emitEvent: false });
    });

    effect(
      () => {
        const allowedSections = this.navigationItems();
        const section = this.activeSection();
        if (allowedSections.length && !allowedSections.some(item => item.id === section)) {
          this.activeSection.set(allowedSections[0].id);
        }
      },
      { allowSignalWrites: true }
    );
  }

  toggleMobileMenu(): void {
    this.isMobileMenuOpen.update(value => !value);
  }

  closeMobileMenu(): void {
    this.isMobileMenuOpen.set(false);
  }

  selectSection(section: WorkspaceSection): void {
    if (!this.navigationItems().some(item => item.id === section)) {
      return;
    }

    this.activeSection.set(section);
    this.closeMobileMenu();
  }

  logout(): void {
    this.authSession.clearSession();
    void this.router.navigate(['/login']);
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

  setCatalogQuery(query: string): void {
    this.catalogQuery.set(query);
  }

  setCatalogSort(sort: ProductSort): void {
    this.catalogSort.set(sort);
  }

  startProductEdition(product: Product): void {
    if (!this.canManageCatalog()) {
      return;
    }

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
    if (!this.canManageCatalog()) {
      this.productError.set('Tu rol no tiene permisos para editar catalogo.');
      return;
    }

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
    if (!this.canManageCatalog()) {
      this.productError.set('Tu rol no tiene permisos para eliminar productos.');
      return;
    }

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
      return;
    }

    if (!this.canManageOrders()) {
      this.orderError.set('Tu rol actual tiene acceso de solo lectura para pedidos.');
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
            quantity: 1
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
      order: this.orderForm
    }[formName];

    const control = form.controls[controlName as keyof typeof form.controls] as AbstractControl | undefined;
    return !!control && control.invalid && (control.touched || control.dirty);
  }

  getStatusTone(status: string): 'success' | 'warning' | 'neutral' {
    const normalized = status.trim().toLowerCase();
    if (['approved', 'completed', 'paid', 'confirmed'].includes(normalized)) {
      return 'success';
    }
    if (['pending', 'processing', 'created'].includes(normalized)) {
      return 'warning';
    }
    return 'neutral';
  }

  private ensureSelectedProduct(products: Product[]): void {
    const currentSelection = this.orderForm.controls.productId.value;
    const selectedExists = products.some(product => product.id === currentSelection);

    if (!selectedExists) {
      this.orderForm.patchValue({ productId: products[0]?.id ?? '' }, { emitEvent: false });
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
