import { Column, Entity, ManyToMany, PrimaryColumn } from 'typeorm';
import { Rol } from '../roles/rol.entity';

@Entity({ name: 'permissions' })
export class Permission {
  @PrimaryColumn()
  id: string;

  @Column()
  description: string;

  @ManyToMany(() => Rol, (rol) => rol.permissions)
  roles: Rol[];
}
