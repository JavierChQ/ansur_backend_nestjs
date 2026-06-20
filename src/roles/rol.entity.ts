import { User } from "src/users/user.entity";
import { Permission } from "../permissions/permission.entity";
import { Column, Entity, JoinTable, ManyToMany, PrimaryColumn } from "typeorm";

@Entity({name: 'roles'})
export class Rol {
    
    @PrimaryColumn()
    id: string;

    @Column({ unique: true })
    name: string
    
    @Column()
    image: string

    @Column()
    route: string

    @Column({ type: 'datetime', default: () => 'CURRENT_TIMESTAMP' })
    created_at: Date;
    
    @Column({ type: 'datetime', default: () => 'CURRENT_TIMESTAMP' })
    updated_at: Date;

    @ManyToMany(() => User, (user) => user.roles)
    users: User[];

    @ManyToMany(() => Permission, (permission) => permission.roles)
    @JoinTable({
        name: 'role_has_permissions',
        joinColumn: { name: 'id_rol' },
        inverseJoinColumn: { name: 'id_permission' },
    })
    permissions: Permission[];

}