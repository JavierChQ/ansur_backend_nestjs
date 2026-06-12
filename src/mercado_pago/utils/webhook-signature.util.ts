import { createHmac, timingSafeEqual } from 'crypto';

export interface MercadoPagoWebhookHeaders {
  'x-signature'?: string;
  'x-request-id'?: string;
}

function getHeader(
  headers: Record<string, string | undefined>,
  name: string,
): string | undefined {
  const direct = headers[name];
  if (direct) {
    return direct;
  }

  const lower = name.toLowerCase();
  for (const [key, value] of Object.entries(headers)) {
    if (key.toLowerCase() === lower && value) {
      return value;
    }
  }

  return undefined;
}

export function validateMercadoPagoWebhookSignature(
  secret: string,
  headers: Record<string, string | undefined>,
  dataId: string,
): boolean {
  const xSignature = getHeader(headers, 'x-signature');
  const xRequestId = getHeader(headers, 'x-request-id');

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

export function extractWebhookPaymentId(
  body: { type?: string; data?: { id?: string } },
  query: Record<string, string | undefined>,
): string | null {
  const topic = query['topic'] ?? query['type'] ?? body.type;

  if (topic && topic !== 'payment') {
    return null;
  }

  const paymentId =
    body.data?.id ?? query['data.id'] ?? query['id'] ?? query['data_id'];

  return paymentId ? String(paymentId) : null;
}
