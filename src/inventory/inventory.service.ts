import {
  ConflictException,
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, Repository } from 'typeorm';
import { Inventory } from './entities/inventory.entity';
import { StockMovement } from './entities/stock-movement.entity';
import { StockMovementType } from './enums/stock-movement-type.enum';
import { RestockDto } from './dto/restock.dto';
import { AdjustStockDto } from './dto/adjust-stock.dto';
import { Product } from '../products/product.entity';

export interface OrderItemInput {
  id_product: number;
  quantity: number;
}

@Injectable()
export class InventoryService implements OnModuleInit {
  constructor(
    @InjectRepository(Inventory)
    private inventoryRepository: Repository<Inventory>,
    @InjectRepository(StockMovement)
    private stockMovementRepository: Repository<StockMovement>,
    @InjectRepository(Product)
    private productsRepository: Repository<Product>,
    private dataSource: DataSource,
  ) {}

  async onModuleInit() {
    const products = await this.productsRepository.find();
    for (const product of products) {
      const exists = await this.inventoryRepository.findOneBy({
        id_product: product.id,
      });
      if (!exists) {
        await this.createForProduct(product.id, 0, 0);
      }
    }
  }

  async createForProduct(
    productId: number,
    initialStock = 0,
    minStock = 0,
    userId?: number,
    notes?: string,
  ): Promise<Inventory> {
    const inventory = this.inventoryRepository.create({
      id_product: productId,
      quantity: initialStock,
      reserved: 0,
      min_stock: minStock,
    });
    const saved = await this.inventoryRepository.save(inventory);

    if (initialStock > 0) {
      await this.recordMovement({
        id_product: productId,
        type: StockMovementType.INGRESO,
        quantity: initialStock,
        balance_after: initialStock,
        id_user: userId,
        notes: notes ?? 'Stock inicial',
      });
    }

    return saved;
  }

  async getByProductId(productId: number): Promise<Inventory> {
    const inventory = await this.inventoryRepository.findOne({
      where: { id_product: productId },
      relations: ['product'],
    });
    if (!inventory) {
      throw new NotFoundException('Inventario no encontrado para el producto');
    }
    return inventory;
  }

  async getAvailable(productId: number): Promise<number> {
    const inventory = await this.inventoryRepository.findOneBy({
      id_product: productId,
    });
    if (!inventory) return 0;
    return inventory.quantity - inventory.reserved;
  }

  async isInStock(productId: number, quantity = 1): Promise<boolean> {
    return (await this.getAvailable(productId)) >= quantity;
  }

  async getAvailabilityMap(
    productIds: number[],
  ): Promise<Map<number, boolean>> {
    const availableMap = await this.getAvailableMap(productIds);
    const map = new Map<number, boolean>();
    for (const id of productIds) {
      map.set(id, (availableMap.get(id) ?? 0) > 0);
    }
    return map;
  }

  async getAvailableMap(
    productIds: number[],
  ): Promise<Map<number, number>> {
    const map = new Map<number, number>();
    if (productIds.length === 0) return map;

    const inventories = await this.inventoryRepository
      .createQueryBuilder('i')
      .where('i.id_product IN (:...ids)', { ids: productIds })
      .getMany();

    for (const id of productIds) {
      map.set(id, 0);
    }
    for (const inv of inventories) {
      map.set(inv.id_product, inv.quantity - inv.reserved);
    }
    return map;
  }

  async findAllAdmin() {
    const inventories = await this.inventoryRepository.find({
      relations: ['product'],
      order: { id_product: 'ASC' },
    });
    return inventories.map((inv) => this.mapAdminInventory(inv));
  }

  async findLowStock() {
    const inventories = await this.inventoryRepository.find({
      relations: ['product'],
    });
    return inventories
      .filter((inv) => inv.available <= inv.min_stock)
      .map((inv) => this.mapAdminInventory(inv));
  }

  async getStockSummary() {
    const inventories = await this.inventoryRepository.find();
    const lowStock = inventories.filter(
      (inv) => inv.available <= inv.min_stock,
    ).length;
    const outOfStock = inventories.filter((inv) => inv.available <= 0).length;
    return {
      total_products: inventories.length,
      low_stock_count: lowStock,
      out_of_stock_count: outOfStock,
    };
  }

  async getMovements(filters?: {
    id_product?: number;
    type?: StockMovementType;
    limit?: number;
  }) {
    const qb = this.stockMovementRepository
      .createQueryBuilder('m')
      .leftJoinAndSelect('m.product', 'product')
      .leftJoinAndSelect('m.user', 'user')
      .orderBy('m.created_at', 'DESC');

    if (filters?.id_product) {
      qb.andWhere('m.id_product = :id_product', {
        id_product: filters.id_product,
      });
    }
    if (filters?.type) {
      qb.andWhere('m.type = :type', { type: filters.type });
    }
    qb.take(filters?.limit ?? 100);
    return qb.getMany();
  }

  async restock(productId: number, dto: RestockDto, userId: number) {
    return this.dataSource.transaction(async (manager) => {
      const inventory = await this.lockInventory(manager, productId);
      inventory.quantity += dto.quantity;
      await manager.save(inventory);
      await this.recordMovement(
        {
          id_product: productId,
          type: StockMovementType.INGRESO,
          quantity: dto.quantity,
          balance_after: inventory.quantity,
          id_user: userId,
          notes: dto.notes,
        },
        manager,
      );
      return this.mapAdminInventory(inventory);
    });
  }

  async adjust(productId: number, dto: AdjustStockDto, userId: number) {
    return this.dataSource.transaction(async (manager) => {
      const inventory = await this.lockInventory(manager, productId);
      const type =
        dto.direction === 'IN'
          ? StockMovementType.AJUSTE_POSITIVO
          : StockMovementType.AJUSTE_NEGATIVO;

      if (dto.direction === 'OUT' && inventory.available < dto.quantity) {
        throw new ConflictException('Stock disponible insuficiente para el ajuste');
      }

      if (dto.direction === 'IN') {
        inventory.quantity += dto.quantity;
      } else {
        inventory.quantity -= dto.quantity;
      }

      await manager.save(inventory);
      await this.recordMovement(
        {
          id_product: productId,
          type,
          quantity: dto.quantity,
          balance_after: inventory.quantity,
          id_user: userId,
          notes: dto.reason,
        },
        manager,
      );
      return this.mapAdminInventory(inventory);
    });
  }

  async updateMinStock(productId: number, minStock: number) {
    const inventory = await this.getByProductId(productId);
    inventory.min_stock = minStock;
    const saved = await this.inventoryRepository.save(inventory);
    return this.mapAdminInventory(saved);
  }

  async reserveForOrder(
    orderId: number,
    items: OrderItemInput[],
    manager?: EntityManager,
  ): Promise<void> {
    const run = async (em: EntityManager) => {
      const sorted = [...items].sort((a, b) => a.id_product - b.id_product);

      for (const item of sorted) {
        await this.lockInventory(em, item.id_product);

        const result = await em
          .createQueryBuilder()
          .update(Inventory)
          .set({ reserved: () => 'reserved + :qty' })
          .where('id_product = :id AND (quantity - reserved) >= :qty', {
            id: item.id_product,
            qty: item.quantity,
          })
          .setParameter('qty', item.quantity)
          .execute();

        if (!result.affected) {
          throw new ConflictException(
            `Stock insuficiente para el producto ${item.id_product}`,
          );
        }

        const updated = await em.findOneBy(Inventory, {
          id_product: item.id_product,
        });

        await this.recordMovement(
          {
            id_product: item.id_product,
            type: StockMovementType.RESERVA,
            quantity: item.quantity,
            balance_after: updated.quantity,
            id_order: orderId,
            notes: `Reserva orden #${orderId}`,
          },
          em,
        );
      }
    };

    if (manager) {
      await run(manager);
    } else {
      await this.dataSource.transaction(run);
    }
  }

  async confirmSale(
    orderId: number,
    items: OrderItemInput[],
    manager?: EntityManager,
  ): Promise<void> {
    const run = async (em: EntityManager) => {
      const sorted = [...items].sort((a, b) => a.id_product - b.id_product);

      for (const item of sorted) {
        await this.lockInventory(em, item.id_product);

        const result = await em
          .createQueryBuilder()
          .update(Inventory)
          .set({
            quantity: () => 'quantity - :qty',
            reserved: () => 'reserved - :qty',
          })
          .where(
            'id_product = :id AND quantity >= :qty AND reserved >= :qty',
            { id: item.id_product, qty: item.quantity },
          )
          .setParameter('qty', item.quantity)
          .execute();

        if (!result.affected) {
          throw new HttpException(
            `Error al confirmar venta del producto ${item.id_product}`,
            HttpStatus.CONFLICT,
          );
        }

        const updated = await em.findOneBy(Inventory, {
          id_product: item.id_product,
        });

        await this.recordMovement(
          {
            id_product: item.id_product,
            type: StockMovementType.VENTA,
            quantity: item.quantity,
            balance_after: updated.quantity,
            id_order: orderId,
            notes: `Venta orden #${orderId}`,
          },
          em,
        );
      }
    };

    if (manager) {
      await run(manager);
    } else {
      await this.dataSource.transaction(run);
    }
  }

  async releaseReservation(
    orderId: number,
    items: OrderItemInput[],
    manager?: EntityManager,
  ): Promise<void> {
    const run = async (em: EntityManager) => {
      const sorted = [...items].sort((a, b) => a.id_product - b.id_product);

      for (const item of sorted) {
        await this.lockInventory(em, item.id_product);

        const result = await em
          .createQueryBuilder()
          .update(Inventory)
          .set({ reserved: () => 'reserved - :qty' })
          .where('id_product = :id AND reserved >= :qty', {
            id: item.id_product,
            qty: item.quantity,
          })
          .setParameter('qty', item.quantity)
          .execute();

        if (!result.affected) continue;

        const updated = await em.findOneBy(Inventory, {
          id_product: item.id_product,
        });

        await this.recordMovement(
          {
            id_product: item.id_product,
            type: StockMovementType.LIBERACION,
            quantity: item.quantity,
            balance_after: updated.quantity,
            id_order: orderId,
            notes: `Liberación orden #${orderId}`,
          },
          em,
        );
      }
    };

    if (manager) {
      await run(manager);
    } else {
      await this.dataSource.transaction(run);
    }
  }

  async restoreFromRefund(
    orderId: number,
    items: OrderItemInput[],
    userId?: number,
  ): Promise<void> {
    await this.dataSource.transaction(async (em) => {
      const sorted = [...items].sort((a, b) => a.id_product - b.id_product);

      for (const item of sorted) {
        const inventory = await this.lockInventory(em, item.id_product);
        inventory.quantity += item.quantity;
        await em.save(inventory);

        await this.recordMovement(
          {
            id_product: item.id_product,
            type: StockMovementType.DEVOLUCION,
            quantity: item.quantity,
            balance_after: inventory.quantity,
            id_order: orderId,
            id_user: userId,
            notes: `Devolución orden #${orderId}`,
          },
          em,
        );
      }
    });
  }

  private async lockInventory(
    manager: EntityManager,
    productId: number,
  ): Promise<Inventory> {
    const inventory = await manager
      .createQueryBuilder(Inventory, 'i')
      .setLock('pessimistic_write')
      .where('i.id_product = :id', { id: productId })
      .getOne();

    if (!inventory) {
      throw new NotFoundException(
        `Inventario no encontrado para el producto ${productId}`,
      );
    }
    return inventory;
  }

  private async recordMovement(
    data: Partial<StockMovement>,
    manager?: EntityManager,
  ): Promise<StockMovement> {
    if (manager) {
      const movement = manager.create(StockMovement, data);
      return manager.save(movement);
    }
    const movement = this.stockMovementRepository.create(data);
    return this.stockMovementRepository.save(movement);
  }

  private mapAdminInventory(inv: Inventory) {
    return {
      id_product: inv.id_product,
      name: inv.product?.name,
      quantity: inv.quantity,
      reserved: inv.reserved,
      available: inv.available,
      min_stock: inv.min_stock,
      is_low_stock: inv.is_low_stock,
      is_out_of_stock: inv.is_out_of_stock,
      updated_at: inv.updated_at,
    };
  }
}
