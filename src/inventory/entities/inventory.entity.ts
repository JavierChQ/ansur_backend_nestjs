import { Product } from '../../products/product.entity';
import {
  Column,
  Entity,
  JoinColumn,
  OneToOne,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity({ name: 'inventory' })
export class Inventory {
  @PrimaryColumn()
  id_product: number;

  @Column({ default: 0 })
  quantity: number;

  @Column({ default: 0 })
  reserved: number;

  @Column({ default: 0 })
  min_stock: number;

  @UpdateDateColumn({ type: 'datetime' })
  updated_at: Date;

  @OneToOne(() => Product, (product) => product.inventory)
  @JoinColumn({ name: 'id_product' })
  product: Product;

  get available(): number {
    return this.quantity - this.reserved;
  }

  get is_low_stock(): boolean {
    return this.available <= this.min_stock;
  }

  get is_out_of_stock(): boolean {
    return this.available <= 0;
  }
}
