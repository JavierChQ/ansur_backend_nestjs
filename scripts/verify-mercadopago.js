/**
 * Verifica credenciales y endpoint público de Mercado Pago.
 * Uso: npm run verify:mercadopago
 */
require('dotenv').config();

const baseUrl = process.env.VERIFY_API_URL || `http://localhost:${process.env.PORT || 3000}`;

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
      checks.push(`OK    Credenciales ${accessIsTest ? 'sandbox (TEST-)' : 'producción (APP_USR-)'}`);
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
        checks.push(`OK    GET /mercadopago/config (sandbox=${config.sandbox})`);
      } else {
        checks.push('FAIL  Respuesta de /mercadopago/config incompleta');
      }
    }
  } catch (error) {
    checks.push(`FAIL  No se pudo contactar ${baseUrl} (${error.message})`);
  }

  console.log('\nVerificación Mercado Pago — Ansur\n');
  for (const line of checks) {
    console.log(line);
  }
  console.log('\nWebhook producción: https://api.ansur.com.pe/mercadopago/webhooks');
  console.log('Panel MP → Webhooks → evento payment → pegar MERCADOPAGO_WEBHOOK_SECRET\n');

  const failed = checks.some((line) => line.startsWith('FAIL'));
  process.exit(failed ? 1 : 0);
}

main();
