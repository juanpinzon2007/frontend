import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { runtimeConfig } from './app-config';

export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  availableStock: number;
}

export interface Order {
  id: string;
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  customerName: string;
  status: string;
  createdAt: string;
}

export interface CreateProductPayload {
  name: string;
  description: string;
  price: number;
  availableStock: number;
}

export interface CreateOrderPayload {
  productId: string;
  quantity: number;
  customerName: string;
}

@Injectable({ providedIn: 'root' })
export class StoreApiService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = runtimeConfig.apiUrl;

  getProducts(): Observable<Product[]> {
    return this.http.get<Product[]>(`${this.apiUrl}/products`);
  }

  createProduct(payload: CreateProductPayload): Observable<Product> {
    return this.http.post<Product>(`${this.apiUrl}/products`, payload);
  }

  getOrders(): Observable<Order[]> {
    return this.http.get<Order[]>(`${this.apiUrl}/orders`);
  }

  createOrder(payload: CreateOrderPayload): Observable<Order> {
    return this.http.post<Order>(`${this.apiUrl}/orders`, payload);
  }
}
