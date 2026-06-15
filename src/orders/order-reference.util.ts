import { randomInt } from 'crypto';
import { EntityManager } from 'typeorm';
import { Order } from './order.entity';

const REFERENCE_CHARSET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const REFERENCE_LENGTH = 6;

export function generateOrderReferenceCode(): string {
  let code = '';
  for (let index = 0; index < REFERENCE_LENGTH; index++) {
    code += REFERENCE_CHARSET[randomInt(REFERENCE_CHARSET.length)];
  }
  return code;
}

export function getOrderReferenceCode(order: Pick<Order, 'reference_code' | 'id'>): string {
  return order.reference_code ?? String(order.id);
}

export async function createUniqueOrderReferenceCode(
  manager: EntityManager,
  maxAttempts = 5,
): Promise<string> {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const referenceCode = generateOrderReferenceCode();
    const existing = await manager.findOne(Order, {
      where: { reference_code: referenceCode },
      select: ['id'],
    });
    if (!existing) {
      return referenceCode;
    }
  }

  throw new Error('No se pudo generar un código de pedido único');
}
