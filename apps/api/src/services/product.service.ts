import {
  createProductWriteRepository,
  DuplicateSlugError,
  type ProductWriteRepository,
} from '@hamza/db';
import { slugify, type Product } from '@hamza/shared';
import type { ProductInput } from '@hamza/shared/schemas';

/**
 * Product management.
 *
 * Sits between the routes and the repository so the rules that are neither HTTP
 * nor SQL live somewhere: deriving a slug, generating an id, and deciding that
 * a product with orders against it is hidden rather than deleted.
 */

export { DuplicateSlugError };

export class ProductNotFoundError extends Error {
  constructor(id: string) {
    super(`No product with id ${id}`);
    this.name = 'ProductNotFoundError';
  }
}

export interface ProductService {
  list(): Promise<Product[]>;
  get(id: string): Promise<Product>;
  create(input: ProductInput): Promise<Product>;
  update(id: string, input: ProductInput): Promise<Product>;
  setActive(id: string, isActive: boolean): Promise<Product>;
}

export function createProductService(db: D1Database): ProductService {
  const repository: ProductWriteRepository = createProductWriteRepository(db);

  return {
    list: () => repository.listAll(),

    async get(id: string): Promise<Product> {
      const product = await repository.findById(id);
      if (!product) throw new ProductNotFoundError(id);
      return product;
    },

    async create(input: ProductInput): Promise<Product> {
      /*
       * The slug is what goes in a TikTok caption, so it is derived from the
       * name when admin did not supply one — one less field for the owner to
       * fill in on a phone.
       */
      const slug = input.slug || slugify(input.name);
      return repository.create(crypto.randomUUID(), { ...input, slug });
    },

    async update(id: string, input: ProductInput): Promise<Product> {
      const product = await repository.update(id, input);
      if (!product) throw new ProductNotFoundError(id);
      return product;
    },

    /**
     * Hiding, not deleting.
     *
     * Past orders reference the product by id and store its name and price, but
     * the owner still needs to look one up months later. Deleting is not offered
     * through this service at all.
     */
    async setActive(id: string, isActive: boolean): Promise<Product> {
      const product = await repository.setActive(id, isActive);
      if (!product) throw new ProductNotFoundError(id);
      return product;
    },
  };
}
