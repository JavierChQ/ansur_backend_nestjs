import { createHmac, timingSafeEqual } from 'crypto';

export interface MercadoPagoWebhookHeaders {
  'x-signature'?: string;
  'x-request-id'?: string;
}

export function validateMercadoPagoWebhookSignature(
  secret: string,
  headers: MercadoPagoWebhookHeaders,
  dataId: string,
): boolean {
  const xSignature = headers['x-signature'];
  const xRequestId = headers['x-request-id'];

  if (!xSignature || !xRequestId || !secret) {
    return false;
  }

  let ts = '';
  let receivedHash = '';

  for (const part of xSignature.split(',')) {
    const [key, value] = part.split('=');
    if (key?.trim() === 'ts') {
      ts = value?.trim() ?? '';
    }
    if (key?.trim() === 'v1') {
      receivedHash = value?.trim() ?? '';
    }
  }

  if (!ts || !receivedHash) {
    return false;
  }

  const manifest = `id:${dataId};request-id:${xRequestId};ts:${ts};`;
  const expectedHash = createHmac('sha256', secret).update(manifest).digest('hex');

  try {
    return timingSafeEqual(
      Buffer.from(receivedHash, 'utf8'),
      Buffer.from(expectedHash, 'utf8'),
    );
  } catch {
    return false;
  }
}
