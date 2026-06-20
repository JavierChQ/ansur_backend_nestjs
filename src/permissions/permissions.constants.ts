export const PermissionCode = {
  SHOP_CART: 'shop:cart',
  SHOP_CHECKOUT: 'shop:checkout',
  SHOP_ORDERS_OWN: 'shop:orders:own',
  SHOP_ADDRESS: 'shop:address',
  SHOP_PROFILE: 'shop:profile',
  ADMIN_PANEL_ACCESS: 'admin:panel:access',
  ADMIN_PRODUCTS_READ: 'admin:products:read',
  ADMIN_PRODUCTS_MANAGE: 'admin:products:manage',
  ADMIN_CATEGORIES_MANAGE: 'admin:categories:manage',
  ADMIN_ORDERS_READ: 'admin:orders:read',
  ADMIN_ORDERS_MANAGE: 'admin:orders:manage',
  ADMIN_INVENTORY_MANAGE: 'admin:inventory:manage',
  ADMIN_CUSTOMERS_READ: 'admin:customers:read',
  ADMIN_USERS_CREATE_CLIENT: 'admin:users:create:client',
  ADMIN_USERS_CREATE_ADMIN: 'admin:users:create:admin',
  ADMIN_USERS_DELETE: 'admin:users:delete',
  ADMIN_ROLES_MANAGE: 'admin:roles:manage',
} as const;

export type PermissionCodeValue =
  (typeof PermissionCode)[keyof typeof PermissionCode];

export const ALL_PERMISSION_CODES: PermissionCodeValue[] =
  Object.values(PermissionCode);

export const CLIENT_PERMISSIONS: PermissionCodeValue[] = [
  PermissionCode.SHOP_CART,
  PermissionCode.SHOP_CHECKOUT,
  PermissionCode.SHOP_ORDERS_OWN,
  PermissionCode.SHOP_ADDRESS,
  PermissionCode.SHOP_PROFILE,
];

export const ADMIN_PERMISSIONS: PermissionCodeValue[] = [
  PermissionCode.ADMIN_PANEL_ACCESS,
  PermissionCode.ADMIN_PRODUCTS_READ,
  PermissionCode.ADMIN_PRODUCTS_MANAGE,
  PermissionCode.ADMIN_CATEGORIES_MANAGE,
  PermissionCode.ADMIN_ORDERS_READ,
  PermissionCode.ADMIN_ORDERS_MANAGE,
  PermissionCode.ADMIN_INVENTORY_MANAGE,
  PermissionCode.ADMIN_CUSTOMERS_READ,
  PermissionCode.ADMIN_USERS_CREATE_CLIENT,
];
