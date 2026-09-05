import type { Order, Product } from '@hamza/shared';

/**
 * The one place admin talks to the server.
 *
 * No component calls `fetch` directly. Requests carry credentials so the
 * Cloudflare Access cookie rides along — there is no token handling here and no
 * login screen, because Access owns authentication entirely.
 */

const BASE = '/api/admin';

export class ApiError extends Error {
  readonly status: number;
  readonly fields: Record<string, string>;

  constructor(status: number, message: string, fields: Record<string, string> = {}) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.fields = fields;
  }
}

interface ErrorBody {
  error?: string;
  fields?: Record<string, string>;
}

async function toError(response: Response): Promise<ApiError> {
  let body: ErrorBody = {};
  try {
    body = (await response.json()) as ErrorBody;
  } catch {
    /* Non-JSON error (a gateway page, or Access bouncing us) — fall through. */
  }

  /*
   * A 401 here almost always means the Access session expired. Reloading sends
   * the browser back through Access rather than leaving the owner staring at a
   * dead screen.
   */
  if (response.status === 401) {
    return new ApiError(401, 'Your session expired. Reload the page to sign in again.');
  }

  return new ApiError(
    response.status,
    body.error ?? `Request failed (${response.status})`,
    body.fields ?? {},
  );
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(`${BASE}${path}`, {
    credentials: 'same-origin',
    ...init,
  });

  if (!response.ok) throw await toError(response);
  return (await response.json()) as T;
}

function jsonRequest<T>(path: string, method: string, body: unknown): Promise<T> {
  return request<T>(path, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

export interface ProductInputBody {
  slug: string;
  name: string;
  description: string;
  price_pkr: number;
  sale_price_pkr: number | null;
  category: string;
  sizes_available: string[];
  images: string[];
  is_active: boolean;
  stock_status: string;
}

export const api = {
  listProducts: () => request<{ products: Product[] }>('/products'),

  getProduct: (id: string) => request<{ product: Product }>(`/products/${id}`),

  createProduct: (body: ProductInputBody) =>
    jsonRequest<{ product: Product }>('/products', 'POST', body),

  updateProduct: (id: string, body: ProductInputBody) =>
    jsonRequest<{ product: Product }>(`/products/${id}`, 'PUT', body),

  setProductVisibility: (id: string, isActive: boolean) =>
    jsonRequest<{ product: Product }>(`/products/${id}/visibility`, 'POST', {
      is_active: isActive,
    }),

  listOrders: (status?: string) =>
    request<{ orders: Order[]; counts: Record<string, number> }>(
      status ? `/orders?order_status=${encodeURIComponent(status)}` : '/orders',
    ),

  updateOrderStatus: (id: string, update: { order_status?: string; payment_status?: string }) =>
    jsonRequest<{ order: Order }>(`/orders/${id}`, 'PATCH', update),

  /** The delivery charge the shop quotes. The total is recomputed server-side. */
  setDeliveryFee: (id: string, deliveryFeePkr: number) =>
    jsonRequest<{ order: Order }>(`/orders/${id}/delivery-fee`, 'PUT', {
      delivery_fee_pkr: deliveryFeePkr,
    }),

  /** Uploads all three variants of one photo; returns the base key to store. */
  uploadImage: async (variants: { thumb: File; product: File; full: File }) => {
    const form = new FormData();
    form.append('thumb', variants.thumb);
    form.append('product', variants.product);
    form.append('full', variants.full);

    return request<{ baseKey: string }>('/uploads/image', { method: 'POST', body: form });
  },
};
