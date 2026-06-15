/**
 * Prueba end-to-end: token Yape (public key) + pago (access token).
 * Uso: node scripts/test-yape-payment.js
 */
require('dotenv').config();

const accessToken = process.env.MERCADOPAGO_ACCESS_TOKEN?.trim();
const publicKey = process.env.MERCADOPAGO_PUBLIC_KEY?.trim();

async function main() {
  if (!accessToken || !publicKey) {
    console.error('Faltan MERCADOPAGO_ACCESS_TOKEN o MERCADOPAGO_PUBLIC_KEY en .env');
    process.exit(1);
  }

  console.log('\n=== Prueba Yape Mercado Pago ===\n');
  console.log(`Public Key: ${publicKey.slice(0, 12)}...`);
  console.log(`Access Token: ${accessToken.slice(0, 12)}...\n`);

  const requestId = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

  console.log('1) Generando token Yape con public key...');
  const tokenResponse = await fetch(
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

  const tokenBody = await tokenResponse.json();
  if (!tokenResponse.ok) {
    console.error('FAIL token Yape:', tokenResponse.status, JSON.stringify(tokenBody, null, 2));
    process.exit(1);
  }

  const yapeToken = tokenBody.id;
  console.log('OK   Token Yape:', yapeToken);

  console.log('\n2) Creando pago con access token (payload mínimo MP)...');
  const paymentResponse = await fetch('https://api.mercadopago.com/v1/payments', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      'X-Idempotency-Key': requestId,
    },
    body: JSON.stringify({
      token: yapeToken,
      transaction_amount: 10,
      installments: 1,
      payment_method_id: 'yape',
      payer: { email: 'test_user_pe@testuser.com' },
    }),
  });

  const paymentBody = await paymentResponse.json();
  console.log('Respuesta pago:', paymentResponse.status, JSON.stringify(paymentBody, null, 2));

  if (!paymentResponse.ok) {
    process.exit(1);
  }

  console.log('\nOK   Integración Yape funcional. Status:', paymentBody.status);
}

main().catch((error) => {
  console.error('Error:', error.message);
  process.exit(1);
});
