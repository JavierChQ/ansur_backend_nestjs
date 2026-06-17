import { Column, Entity, JoinColumn, ManyToOne, OneToMany, PrimaryGeneratedColumn } from "typeorm";
import { User } from 'src/users/user.entity';
import { Address } from '../address/address.entity';
import { OrderHasProducts } from './order_has_products.entity';
import { OrderStatus } from './enums/order-status.enum';

@Entity('orders')
export class Order {

    @PrimaryGeneratedColumn()
    id: number;

    @Column({ type: 'varchar', length: 6, unique: true, nullable: true })
    reference_code: string;

    @Column({ nullable: true })
    id_client: number;
    
    @Column({ nullable: true })
    id_address: number;

    @Column({ default: false })
    is_guest_order: boolean;

    @Column({ nullable: true })
    amount: number;

    @Column({ type: 'varchar', length: 20, default: OrderStatus.PENDIENTE_PAGO })
    status: OrderStatus;

    @Column({ type: 'datetime', nullable: true })
    expires_at: Date;

    @Column({ type: 'varchar', length: 100, nullable: true })
    payment_id: string;

    @Column({ type: 'datetime', nullable: true })
    receipt_sent_at: Date;

    @Column({ type: 'varchar', length: 20, nullable: true })
    delivery_type: string;

    @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true, default: 0 })
    delivery_fee: number;

    @Column({ type: 'varchar', length: 120, nullable: true })
    customer_name: string;

    @Column({ type: 'varchar', length: 120, nullable: true })
    customer_lastname: string;

    @Column({ type: 'varchar', length: 180, nullable: true })
    customer_email: string;

    @Column({ type: 'varchar', length: 20, nullable: true })
    customer_phone: string;

    @Column({ type: 'varchar', length: 20, nullable: true })
    customer_doc_type: string;

    @Column({ type: 'varchar', length: 50, nullable: true })
    customer_doc_number: string;

    @Column({ type: 'varchar', length: 120, nullable: true })
    departamento: string;

    @Column({ type: 'varchar', length: 120, nullable: true })
    provincia: string;

    @Column({ type: 'varchar', length: 120, nullable: true })
    distrito: string;

    @Column({ type: 'varchar', length: 255, nullable: true })
    direccion: string;

    @Column({ type: 'varchar', length: 255, nullable: true })
    referencia: string;

    @Column({ type: 'varchar', length: 20, nullable: true })
    receptor_type: string;

    @Column({ type: 'varchar', length: 120, nullable: true })
    receptor_nombres: string;

    @Column({ type: 'varchar', length: 120, nullable: true })
    receptor_apellidos: string;

    @Column({ type: 'varchar', length: 20, nullable: true })
    receptor_doc_type: string;

    @Column({ type: 'varchar', length: 50, nullable: true })
    receptor_doc_number: string;

    @Column({ type: 'varchar', length: 20, nullable: true })
    invoice_type: string;

    @Column({ type: 'varchar', length: 10, nullable: true })
    invoice_doc_type: string;

    @Column({ type: 'varchar', length: 50, nullable: true })
    invoice_doc_number: string;

    @Column({ type: 'varchar', length: 255, nullable: true })
    invoice_holder_name: string;

    @Column({ type: 'varchar', length: 255, nullable: true })
    invoice_business_name: string;

    @Column({ type: 'varchar', length: 255, nullable: true })
    invoice_address: string;

    @Column({ type: 'datetime', nullable: true })
    invoice_validated_at: Date;

    @Column({ type: 'varchar', length: 50, nullable: true })
    invoice_validation_source: string;

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
}
