import { Product } from '../../products/product.entity';
import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryColumn,
} from 'typeorm';
import { Cart } from './cart.entity';

@Entity({ name: 'cart_items' })
export class CartItem {
  @PrimaryColumn()
  id_cart: number;

  @PrimaryColumn()
  id_product: number;

  @Column()
  quantity: number;

  @ManyToOne(() => Cart, (cart) => cart.items, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'id_cart' })
  cart: Cart;

  @ManyToOne(() => Product)
  @JoinColumn({ name: 'id_product' })
  product: Product;
}
