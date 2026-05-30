import { Column, Entity, JoinColumn, ManyToOne, OneToMany, PrimaryGeneratedColumn } from "typeorm";
import { User } from 'src/users/user.entity';
import { Address } from '../address/address.entity';
import { OrderHasProducts } from './order_has_products.entity';
import { Product } from '../products/product.entity';

@Entity('orders')
export class Order {

    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    id_client: number;
    
    @Column()
    id_address: number;

    @Column({ nullable: true })
    amount: number;

    @Column({default: 'PAGADO'})
    status: string;

    @Column({ type: 'datetime', default: () => 'CURRENT_TIMESTAMP' })
    created_at: Date;
    
    @Column({ type: 'datetime', default: () => 'CURRENT_TIMESTAMP' })
    updated_at: Date;

    @ManyToOne(() => User, (user) => user.id)
    @JoinColumn({ name: 'id_client' })
    user: User;
    
    @ManyToOne(() => Address, (address) => address.id)
    @JoinColumn({ name: 'id_address' })
    address: Address;

    @OneToMany(() => OrderHasProducts, (ohp) => ohp.order)
    @JoinColumn({ referencedColumnName: 'id_order' })
    orderHasProducts: OrderHasProducts[]
    
    // @OneToMany(() => Product, (product) => product.orderHasProducts)
    // @JoinColumn({ referencedColumnName: 'id_order' })
    // products: Product[]

}