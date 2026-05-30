import { Entity, PrimaryGeneratedColumn, Column, BeforeInsert, ManyToMany, JoinTable, OneToMany, DeleteDateColumn } from 'typeorm';
import { hash } from 'bcrypt';
import { Rol } from 'src/roles/rol.entity';
import { Address } from 'src/address/address.entity';
import { Order } from 'src/orders/order.entity';


@Entity({ name: 'users' })
export class User {

    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    name: string;
    
    @Column()
    lastname: string;

    @Column({ unique: true })
    email: string;
    
    @Column({ unique: true })
    phone: string;
    
    @Column({ nullable: true })
    image: string;
    
    @Column()
    password: string;
    
    @Column({ nullable: true })
    notification_token: string;
    
    @Column({ type: 'datetime', default: () => 'CURRENT_TIMESTAMP' })
    created_at: Date;
    
    @Column({ type: 'datetime', default: () => 'CURRENT_TIMESTAMP' })
    updated_at: Date;

    @DeleteDateColumn()
    deleted_at: Date;

    @JoinTable({
        name: 'user_has_roles',
        joinColumn: {
            name: 'id_user'
        },
        inverseJoinColumn: {
            name: 'id_rol'
        }
    })
    @ManyToMany(() => Rol, (rol) => rol.users)
    roles: Rol[];

    @OneToMany(() => Address, address => address.id)
    address: Address;

    @OneToMany(() => Order, order => order.id)
    order: Order;
    
    @BeforeInsert()
    async hashPassword() {
        this.password = await hash(this.password, Number(process.env.HASH_SALT));
    }
}