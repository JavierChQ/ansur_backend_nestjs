
import { OrderHasProducts } from 'src/orders/order_has_products.entity';
import { Category } from '../categories/category.entity';
import { Column, Entity, JoinColumn, ManyToOne, OneToMany, PrimaryGeneratedColumn, JoinTable, ManyToMany } from 'typeorm';


@Entity({ name: 'products' })
export class Product {

    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    name: string;
    
    @Column()
    description: string;

    @Column({ nullable: true })
    image1: string;
    
    @Column({ nullable: true })
    image2: string;
    
    @Column()
    id_category: number;
    
    @Column()
    price: number;

    @Column({ type: 'datetime', default: () => 'CURRENT_TIMESTAMP' })
    created_at: Date;
    
    @Column({ type: 'datetime', default: () => 'CURRENT_TIMESTAMP' })
    updated_at: Date;

    @ManyToOne(() => Category, (category) => category.id)
    @JoinColumn({name: 'id_category'})
    category: Category

    @OneToMany(() => OrderHasProducts, (ohp) => ohp.product)
    @JoinColumn({ referencedColumnName: 'id_product' })
    orderHasProducts: OrderHasProducts[]


}