/**
 * Diagnóstico amplio de credenciales Mercado Pago (Perú).
 * Uso: node scripts/diagnose-mercadopago.js
 */
require('dotenv').config();

const accessToken = process.env.MERCADOPAGO_ACCESS_TOKEN?.trim();
const publicKey = process.env.MERCADOPAGO_PUBLIC_KEY?.trim();

function appIdFromToken(token) {
  const parts = token.split('-');
  return parts[0] === 'TEST' && parts.length >= 2 ? parts[1] : null;
}

async function createYapeToken(requestId) {
  const response = await fetch(
    `https://api.mercadopago.com/platforms/pci/yape/v1/payment?public_key=${encodeURIComponent(publicKey)}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        phoneNumber: '111111111',
        otp: '123456',
        requestId,
      }),
    },
  );
  return { status: response.status, body: await response.json() };
}

async function createCardToken() {
  const response = await fetch(
    `https://api.mercadopago.com/v1/card_tokens?public_key=${encodeURIComponent(publicKey)}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        card_number: '5031755734530604',
        security_code: '123',
        expiration_month: 11,
        expiration_year: 2030,
        cardholder: {
          name: 'APRO',
          identification: { type: 'DNI', number: '12345678' },
        },
      }),
    },
  );
  return { status: response.status, body: await response.json() };
}

async function createPayment(payload, requestId) {
  const response = await fetch('https://api.mercadopago.com/v1/payments', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      'X-Idempotency-Key': requestId,
    },
    body: JSON.stringify(payload),
  });
  return { status: response.status, body: await response.json() };
}

async function main() {
  if (!accessToken || !publicKey) {
    console.error('Faltan credenciales en .env');
    process.exit(1);
  }

  console.log('\n=== Diagnóstico Mercado Pago (Perú) ===\n');
  console.log('App ID access token:', appIdFromToken(accessToken));
  console.log('Public key prefix:', publicKey.slice(0, 20) + '...');
  console.log('User ID suffix token:', accessToken.split('-').pop());

  const methodsRes = await fetch('https://api.mercadopago.com/v1/payment_methods', {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const methods = await methodsRes.json();
  const yapeMethod = Array.isArray(methods) ? methods.find((m) => m.id === 'yape') : null;
  console.log('\nYape en payment_methods:', yapeMethod ? yapeMethod.status : 'NO');

  console.log('\n--- Prueba 1: Yape TEST ---');
  const yapeReq = `yape-${Date.now()}`;
  const yapeTokenRes = await createYapeToken(yapeReq);
  console.log('Token Yape HTTP', yapeTokenRes.status);
  if (yapeTokenRes.status === 200) {
    console.log('Token public_key en respuesta === env:', yapeTokenRes.body.public_key === publicKey);
    console.log('client_id en token:', yapeTokenRes.body.client_id ?? '(no presente)');
    const pay = await createPayment(
      {
        token: yapeTokenRes.body.id,
        transaction_amount: 10,
        installments: 1,
        payment_method_id: 'yape',
        payer: { email: 'test_user_pe@testuser.com' },
      },
      yapeReq,
    );
    console.log('Pago Yape HTTP', pay.status, '→', pay.body.message || pay.body.status, pay.body.status_detail || '');
  } else {
    console.log(JSON.stringify(yapeTokenRes.body));
  }

  console.log('\n--- Prueba 2: Tarjeta TEST (APRO) ---');
  const cardReq = `card-${Date.now()}`;
  const cardTokenRes = await createCardToken();
  console.log('Token tarjeta HTTP', cardTokenRes.status);
  if (cardTokenRes.status === 201 || cardTokenRes.status === 200) {
    const pay = await createPayment(
      {
        token: cardTokenRes.body.id,
        transaction_amount: 10,
        installments: 1,
        payment_method_id: cardTokenRes.body.payment_method_id || 'visa',
        issuer_id: cardTokenRes.body.issuer_id,
        payer: {
          email: 'test_user_pe@testuser.com',
          identification: { type: 'DNI', number: '12345678' },
        },
      },
      cardReq,
    );
    console.log('Pago tarjeta HTTP', pay.status, '→', pay.body.message || pay.body.status, pay.body.status_detail || '');
    if (!pay.body.status && pay.body.message) {
      console.log('Detalle:', JSON.stringify(pay.body));
    }
  } else {
    console.log(JSON.stringify(cardTokenRes.body));
  }

  console.log('\n--- Prueba 3: Yape con monto 50 ---');
  const yapeReq2 = `yape50-${Date.now()}`;
  const yapeToken2 = await createYapeToken(yapeReq2);
  if (yapeToken2.status === 200) {
    const pay = await createPayment(
      {
        token: yapeToken2.body.id,
        transaction_amount: 50,
        description: 'Prueba diagnóstico',
        installments: 1,
        payment_method_id: 'yape',
        payer: { email: 'test_user_pe@testuser.com' },
      },
      yapeReq2,
    );
    console.log('Pago Yape S/50 HTTP', pay.status, '→', pay.body.message || pay.body.status, pay.body.status_detail || '');
  }

  console.log('\nSi TODAS fallan con internal_error, el problema es de la cuenta/aplicación MP,');
  console.log('no del código. Activá credenciales productivas en el panel o contactá soporte MP.\n');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
