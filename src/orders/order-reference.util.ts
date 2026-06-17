import { randomInt } from 'crypto';
import { EntityManager } from 'typeorm';
import { Order } from './order.entity';

const REFERENCE_LETTERS = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
const REFERENCE_DIGITS = '23456789';
const REFERENCE_CHARSET = `${REFERENCE_LETTERS}${REFERENCE_DIGITS}`;
const REFERENCE_LENGTH = 6;

export function generateOrderReferenceCode(): string {
  const chars: string[] = [
    REFERENCE_LETTERS[randomInt(REFERENCE_LETTERS.length)],
    REFERENCE_DIGITS[randomInt(REFERENCE_DIGITS.length)],
  ];

  for (let index = chars.length; index < REFERENCE_LENGTH; index++) {
    chars.push(REFERENCE_CHARSET[randomInt(REFERENCE_CHARSET.length)]);
  }

  for (let index = chars.length - 1; index > 0; index--) {
    const swapIndex = randomInt(index + 1);
    [chars[index], chars[swapIndex]] = [chars[swapIndex], chars[index]];
  }

  return chars.join('');
}

export function getOrderReferenceCode(order: Pick<Order, 'reference_code' | 'id'>): string {
  const code = order.reference_code?.trim();
  if (code) {
    return code.toUpperCase();
  }

  return String(order.id);
}

export function isAlphanumericOrderReference(code: string): boolean {
  return /^[A-Z0-9]{6}$/.test(code) && /[A-Z]/.test(code) && /\d/.test(code);
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
