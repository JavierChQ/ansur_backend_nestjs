/**
 * Verifica credenciales y capacidad real de cobro en Mercado Pago.
 * Uso: npm run verify:mercadopago
 */
require('dotenv').config();

const baseUrl = process.env.VERIFY_API_URL || `http://localhost:${process.env.PORT || 3000}`;

function extractApplicationId(accessToken) {
  const parts = accessToken.split('-');
  return parts.length >= 2 && parts[0] === 'TEST' ? parts[1] : null;
}

async function createYapeToken(publicKey, requestId) {
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

async function createCardToken(publicKey) {
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

async function createPayment(accessToken, payload, requestId) {
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
  const checks = [];

  const accessToken = process.env.MERCADOPAGO_ACCESS_TOKEN?.trim();
  const publicKey = process.env.MERCADOPAGO_PUBLIC_KEY?.trim();
  const webhookSecret = process.env.MERCADOPAGO_WEBHOOK_SECRET?.trim();
  const nodeEnv = process.env.NODE_ENV || 'development';

  if (!accessToken || !publicKey) {
    checks.push('FAIL  MERCADOPAGO_ACCESS_TOKEN y MERCADOPAGO_PUBLIC_KEY deben estar definidas');
  } else {
    const accessIsTest = accessToken.startsWith('TEST-');
    const publicIsTest = publicKey.startsWith('TEST-');
    if (accessIsTest !== publicIsTest) {
      checks.push('FAIL  Access token y public key deben ser del mismo entorno (TEST o APP_USR)');
    } else {
      checks.push(`OK    Prefijo ${accessIsTest ? 'sandbox (TEST-)' : 'producción (APP_USR-)'}`);
      const appId = extractApplicationId(accessToken);
      if (appId) {
        checks.push(`INFO  App ID del access token: ${appId}`);
      }
    }
  }

  if (nodeEnv === 'production' && !webhookSecret) {
    checks.push('FAIL  MERCADOPAGO_WEBHOOK_SECRET requerido en producción');
  } else if (webhookSecret) {
    checks.push('OK    MERCADOPAGO_WEBHOOK_SECRET configurado');
  } else {
    checks.push('WARN  MERCADOPAGO_WEBHOOK_SECRET vacío (aceptable solo en desarrollo local)');
  }

  try {
    const response = await fetch(`${baseUrl}/mercadopago/config`);
    if (!response.ok) {
      checks.push(`FAIL  GET /mercadopago/config → HTTP ${response.status}`);
    } else {
      const config = await response.json();
      if (config.public_key && config.site_id === 'MPE') {
        checks.push(`OK    Backend expone public key (sandbox=${config.sandbox})`);
        if (config.public_key !== publicKey) {
          checks.push('FAIL  La public key del backend no coincide con MERCADOPAGO_PUBLIC_KEY del .env');
          checks.push('      Reiniciá el backend después de cambiar el .env');
        }
      } else {
        checks.push('FAIL  Respuesta de /mercadopago/config incompleta');
      }
    }
  } catch (error) {
    checks.push(`WARN  Backend no disponible en ${baseUrl} (${error.message})`);
  }

  if (accessToken) {
    try {
      const response = await fetch('https://api.mercadopago.com/v1/payment_methods', {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (!response.ok) {
        checks.push(`FAIL  Access token rechazado por Mercado Pago (HTTP ${response.status})`);
      } else {
        checks.push('OK    Access token válido (consulta payment_methods)');
      }
    } catch (error) {
      checks.push(`FAIL  No se pudo validar el access token (${error.message})`);
    }
  }

  let tokenGenerationOk = false;
  let paymentBlocked = false;

  if (accessToken && publicKey) {
    try {
      const cardReq = `verify-card-${Date.now()}`;
      const cardToken = await createCardToken(publicKey);

      if (cardToken.status === 200 || cardToken.status === 201) {
        tokenGenerationOk = true;
        checks.push('OK    Token de tarjeta de prueba generado (Public Key funciona)');

        const cardPay = await createPayment(
          accessToken,
          {
            token: cardToken.body.id,
            transaction_amount: 10,
            installments: 1,
            payment_method_id: cardToken.body.payment_method_id || 'visa',
            issuer_id: cardToken.body.issuer_id,
            payer: {
              email: 'test_user_pe@testuser.com',
              identification: { type: 'DNI', number: '12345678' },
            },
            description: 'Verificación Ansur',
          },
          cardReq,
        );

        if (cardPay.status >= 200 && cardPay.status < 300) {
          checks.push(`OK    Cobro de prueba con tarjeta exitoso (status=${cardPay.body.status})`);
        } else if (cardPay.body?.message === 'internal_error') {
          paymentBlocked = true;
          checks.push('FAIL  Mercado Pago rechazó POST /v1/payments (internal_error) con tarjeta de prueba');
        } else {
          checks.push(`FAIL  Cobro con tarjeta HTTP ${cardPay.status}: ${JSON.stringify(cardPay.body)}`);
        }
      } else {
        checks.push(`FAIL  No se pudo generar token de tarjeta (HTTP ${cardToken.status})`);
        checks.push(`      ${JSON.stringify(cardToken.body)}`);
      }

      const yapeReq = `verify-yape-${Date.now()}`;
      const yapeToken = await createYapeToken(publicKey, yapeReq);

      if (yapeToken.status === 200) {
        tokenGenerationOk = true;
        const yapePay = await createPayment(
          accessToken,
          {
            token: yapeToken.body.id,
            transaction_amount: 10,
            installments: 1,
            payment_method_id: 'yape',
            payer: { email: 'test_user_pe@testuser.com' },
          },
          yapeReq,
        );

        if (yapePay.status >= 200 && yapePay.status < 300) {
          checks.push(`OK    Cobro de prueba Yape exitoso (status=${yapePay.body.status})`);
        } else if (yapePay.body?.message === 'internal_error') {
          paymentBlocked = true;
          checks.push('FAIL  Mercado Pago rechazó POST /v1/payments (internal_error) con Yape de prueba');
        } else {
          checks.push(`FAIL  Cobro Yape HTTP ${yapePay.status}: ${JSON.stringify(yapePay.body)}`);
        }
      } else {
        checks.push(`WARN  Token Yape no disponible (HTTP ${yapeToken.status})`);
      }

      if (paymentBlocked && tokenGenerationOk) {
        checks.push('');
        checks.push('>>> Diagnóstico: las credenciales generan tokens, pero la cuenta NO puede cobrar.');
        checks.push('    Esto NO es un bug del código. Acciones en el panel de Mercado Pago:');
        checks.push('    1) Confirmá que la app es "Checkout API" / Pagos online (no solo Checkout Pro)');
        checks.push('    2) Activá Credenciales productivas (Industria + URL del sitio web)');
        checks.push('    3) Revisá que tu cuenta vendedor esté habilitada para cobrar online');
        checks.push('    4) Creá Cuentas de prueba (Comprador + Vendedor) en la app');
        checks.push('    5) Si sigue igual, contactá soporte MP con App ID y error internal_error en /v1/payments');
      } else if (!tokenGenerationOk) {
        checks.push('');
        checks.push('>>> Copiá Public Key y Access Token juntos desde Credenciales de prueba de la MISMA app.');
      }
    } catch (error) {
      checks.push(`FAIL  Error en prueba de cobro (${error.message})`);
    }
  }

  console.log('\nVerificación Mercado Pago — Ansur\n');
  for (const line of checks) {
    console.log(line);
  }
  console.log('\nDiagnóstico completo: npm run diagnose:mercadopago');
  console.log('Webhook producción: https://api.ansur.com.pe/mercadopago/webhooks\n');

  const failed = checks.some((line) => line.startsWith('FAIL'));
  process.exitCode = failed ? 1 : 0;
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => {
    setTimeout(() => process.exit(process.exitCode ?? 0), 100);
  });
