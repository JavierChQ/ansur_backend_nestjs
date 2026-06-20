export enum AppRole {
  CLIENT = 'CLIENT',
  ADMIN = 'ADMIN',
  SUPER_ADMIN = 'SUPER_ADMIN',
}

export const ADMIN_PANEL_ROLES: AppRole[] = [AppRole.ADMIN, AppRole.SUPER_ADMIN];

export function isAdminPanelUser(user: {
  roles?: Array<{ id: string }>;
  role?: string;
}): boolean {
  const roleId = user.role ?? user.roles?.[0]?.id;
  return roleId ? ADMIN_PANEL_ROLES.includes(roleId as AppRole) : false;
}
