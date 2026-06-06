import { Product } from '../../products/product.entity';
import { User } from '../../users/user.entity';
import { Order } from '../../orders/order.entity';
import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { StockMovementType } from '../enums/stock-movement-type.enum';

@Entity({ name: 'stock_movements' })
export class StockMovement {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  id_product: number;

  @Column({ type: 'varchar', length: 30 })
  type: StockMovementType;

  @Column()
  quantity: number;

  @Column()
  balance_after: number;

  @Column({ nullable: true })
  id_user: number;

  @Column({ nullable: true })
  id_order: number;

  @Column({ type: 'varchar', length: 500, nullable: true })
  notes: string;

  @CreateDateColumn({ type: 'datetime' })
  created_at: Date;

  @ManyToOne(() => Product, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'id_product' })
  product: Product;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'id_user' })
  user: User;

  @ManyToOne(() => Order, { nullable: true })
  @JoinColumn({ name: 'id_order' })
  order: Order;
}
