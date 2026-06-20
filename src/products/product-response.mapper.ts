import { PermissionCode } from '../permissions/permissions.constants';
import { Product } from './product.entity';

export const PRICE_BELOW_COST_WARNING =
  'El precio de venta es menor al precio de compra';

export interface ProductRequestUser {
  roles?: string[];
  permissions?: string[];
}

export interface ProductWithStock extends Product {
  in_stock?: boolean;
  available?: number;
}

export function isAdminUser(user?: ProductRequestUser | null): boolean {
  return (
    user?.permissions?.includes(PermissionCode.ADMIN_PRODUCTS_READ) ?? false
  );
}

function toNumber(value: number | string): number {
  return Number(value);
}

export function buildPriceWarning(
  salePrice: number,
  purchasePrice: number,
): string | undefined {
  return salePrice < purchasePrice ? PRICE_BELOW_COST_WARNING : undefined;
}

export function toPublicProductResponse(product: ProductWithStock) {
  return {
    id: product.id,
    name: product.name,
    description: product.description,
    image1: product.image1,
    image2: product.image2,
    id_category: product.id_category,
    sales_price: toNumber(product.sale_price),
    in_stock: product.in_stock ?? false,
    available: product.available ?? 0,
  };
}

export function toAdminProductResponse(product: ProductWithStock) {
  const purchasePrice = toNumber(product.purchase_price);
  const salePrice = toNumber(product.sale_price);
  const priceWarning = buildPriceWarning(salePrice, purchasePrice);

  return {
    id: product.id,
    name: product.name,
    description: product.description,
    image1: product.image1,
    image2: product.image2,
    id_category: product.id_category,
    purchase_price: purchasePrice,
    sale_price: salePrice,
    in_stock: product.in_stock ?? false,
    available: product.available ?? 0,
    ...(priceWarning && { price_warning: priceWarning }),
  };
}

export function mapProductResponse(
  product: ProductWithStock,
  isAdmin: boolean,
) {
  return isAdmin
    ? toAdminProductResponse(product)
    : toPublicProductResponse(product);
}

export function mapProductsResponse(
  products: ProductWithStock[],
  isAdmin: boolean,
) {
  return products.map((product) => mapProductResponse(product, isAdmin));
}
