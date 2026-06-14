import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { randomBytes } from 'crypto';
import { DataSource, In, Repository } from 'typeorm';
import { Address } from '../address/address.entity';
import { STORE_PICKUP_ADDRESS } from '../common/constants/checkout.constants';
import { Rol } from '../roles/rol.entity';
import { User } from '../users/user.entity';
import { Order } from './order.entity';

@Injectable()
export class GuestUserProvisioningService {
  private readonly logger = new Logger(GuestUserProvisioningService.name);

  constructor(
    @InjectRepository(Order)
    private readonly ordersRepository: Repository<Order>,
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
    @InjectRepository(Address)
    private readonly addressRepository: Repository<Address>,
    @InjectRepository(Rol)
    private readonly rolesRepository: Repository<Rol>,
    private readonly dataSource: DataSource,
  ) {}

  async provisionUserForOrder(orderId: number): Promise<User | null> {
    const order = await this.ordersRepository.findOne({ where: { id: orderId } });

    if (!order) {
      this.logger.warn(`Orden ${orderId} no encontrada para provisioning`);
      return null;
    }

    if (order.id_client) {
      return this.usersRepository.findOne({
        where: { id: order.id_client },
        relations: ['roles'],
      });
    }

    if (!order.is_guest_order) {
      this.logger.warn(`Orden ${orderId} no es guest y no tiene cliente asignado`);
      return null;
    }

    return this.dataSource.transaction(async (manager) => {
      const lockedOrder = await manager.findOne(Order, {
        where: { id: orderId },
        lock: { mode: 'pessimistic_write' },
      });

      if (!lockedOrder) {
        return null;
      }

      if (lockedOrder.id_client) {
        return manager.findOne(User, {
          where: { id: lockedOrder.id_client },
          relations: ['roles'],
        });
      }

      const existingByEmail = await manager.findOne(User, {
        where: { email: lockedOrder.customer_email },
        relations: ['roles'],
      });

      let user: User;

      if (existingByEmail) {
        user = existingByEmail;
        this.logger.log(
          `Orden ${orderId} vinculada a usuario existente ${existingByEmail.id}`,
        );
      } else {
        const phoneOwner = await manager.findOne(User, {
          where: { phone: lockedOrder.customer_phone },
        });

        if (phoneOwner) {
          this.logger.error(
            `Orden ${orderId}: teléfono ${lockedOrder.customer_phone} ya registrado; provisioning incompleto`,
          );
          return null;
        }

        const roles = await manager.find(Rol, { where: { id: In(['CLIENT']) } });
        user = manager.create(User, {
          name: lockedOrder.customer_name,
          lastname: lockedOrder.customer_lastname,
          email: lockedOrder.customer_email,
          phone: lockedOrder.customer_phone,
          password: randomBytes(16).toString('hex'),
          is_guest: true,
          password_not_set: true,
          roles,
        });
        user = await manager.save(user);
        this.logger.log(`Usuario guest ${user.id} creado para orden ${orderId}`);
      }

      const addressPayload = this.buildAddressFromOrder(lockedOrder);
      const address = manager.create(Address, {
        address: addressPayload.address,
        district: addressPayload.district,
        id_user: user.id,
      });
      const savedAddress = await manager.save(address);

      lockedOrder.id_client = user.id;
      lockedOrder.id_address = savedAddress.id;
      await manager.save(lockedOrder);

      return manager.findOne(User, {
        where: { id: user.id },
        relations: ['roles'],
      });
    });
  }

  private buildAddressFromOrder(order: Order): { address: string; district: string } {
    const receptorName = `${order.receptor_nombres ?? ''} ${order.receptor_apellidos ?? ''}`.trim();
    const receptorDoc =
      order.receptor_doc_type && order.receptor_doc_number
        ? `${order.receptor_doc_type} ${order.receptor_doc_number}`
        : '';

    if (order.delivery_type === 'pickup') {
      return {
        address: [
          'Retiro en tienda',
          STORE_PICKUP_ADDRESS,
          `Cliente: ${order.customer_name} ${order.customer_lastname}`,
          `Receptor: ${receptorName}`,
          receptorDoc ? `Doc receptor: ${receptorDoc}` : '',
          `Tel: ${order.customer_phone}`,
        ]
          .filter(Boolean)
          .join(' | '),
        district: 'Arequipa',
      };
    }

    return {
      address: [
        order.direccion,
        [order.distrito, order.provincia, order.departamento].filter(Boolean).join(', '),
        order.referencia ? `Ref: ${order.referencia}` : '',
        receptorName ? `Receptor: ${receptorName}` : '',
        receptorDoc ? `Doc receptor: ${receptorDoc}` : '',
        `Tel: ${order.customer_phone}`,
      ]
        .filter(Boolean)
        .join(' | '),
      district: order.distrito ?? 'Arequipa',
    };
  }
}
