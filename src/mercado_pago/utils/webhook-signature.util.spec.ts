import {
  extractWebhookPaymentId,
  validateMercadoPagoWebhookSignature,
} from './webhook-signature.util';

describe('webhook-signature.util', () => {
  const secret = 'test-webhook-secret';

  it('valida firma x-signature correcta', () => {
    const dataId = '12345';
    const xRequestId = 'req-abc';
    const ts = '1704908010';
    const manifest = `id:${dataId};request-id:${xRequestId};ts:${ts};`;

    const crypto = require('crypto');
    const v1 = crypto.createHmac('sha256', secret).update(manifest).digest('hex');

    const isValid = validateMercadoPagoWebhookSignature(
      secret,
      {
        'x-signature': `ts=${ts},v1=${v1}`,
        'x-request-id': xRequestId,
      },
      dataId,
    );

    expect(isValid).toBe(true);
  });

  it('rechaza firma inválida', () => {
    const isValid = validateMercadoPagoWebhookSignature(
      secret,
      {
        'x-signature': 'ts=1704908010,v1=invalid',
        'x-request-id': 'req-abc',
      },
      '12345',
    );

    expect(isValid).toBe(false);
  });

  it('extrae payment id desde query IPN', () => {
    const paymentId = extractWebhookPaymentId(
      {},
      { topic: 'payment', id: '99887766' },
    );

    expect(paymentId).toBe('99887766');
  });

  it('extrae payment id desde body webhook', () => {
    const paymentId = extractWebhookPaymentId(
      { type: 'payment', data: { id: '55443322' } },
      {},
    );

    expect(paymentId).toBe('55443322');
  });

  it('ignora topics distintos a payment', () => {
    const paymentId = extractWebhookPaymentId(
      {},
      { topic: 'merchant_order', id: '111' },
    );

    expect(paymentId).toBeNull();
  });
});
