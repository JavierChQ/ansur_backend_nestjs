import { SetMetadata } from '@nestjs/common';
import { PermissionCodeValue } from '../../permissions/permissions.constants';

export const PERMISSIONS_KEY = 'permissions';

export const RequirePermissions = (...permissions: PermissionCodeValue[]) =>
  SetMetadata(PERMISSIONS_KEY, permissions);
