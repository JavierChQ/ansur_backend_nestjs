import { Injectable } from '@nestjs/common';
import { formatCurrency } from '../utils/tax.util';
import { escapeHtml } from './html.util';
import { OrderReceiptView } from './order-receipt.types';

@Injectable()
export class OrderReceiptHtmlRenderer {
  render(view: OrderReceiptView): string {
    const lineRows = view.lines
      .map(
        (line) => `
        <tr>
          <td style="padding:8px;border-bottom:1px solid #eee;">${escapeHtml(line.description)}</td>
          <td style="padding:8px;border-bottom:1px solid #eee;text-align:center;">${line.quantity}</td>
          <td style="padding:8px;border-bottom:1px solid #eee;text-align:right;">${formatCurrency(line.unitPrice)}</td>
          <td style="padding:8px;border-bottom:1px solid #eee;text-align:right;">${formatCurrency(line.lineTotal)}</td>
        </tr>
      `,
      )
      .join('');

    const invoiceBlock = view.invoice
      ? `
  <div style="margin:20px 0;padding:16px;background:#f8f9fa;border:1px solid #ddd;border-radius:8px;">
    <h3 style="margin:0 0 8px;font-size:15px;color:#333;">Datos para tu comprobante</h3>
    <p style="margin:4px 0;"><strong>Tipo solicitado:</strong> ${escapeHtml(view.invoice.typeLabel)}</p>
    <p style="margin:4px 0;"><strong>Documento:</strong> ${escapeHtml(view.invoice.documentLabel)}</p>
    <p style="margin:4px 0;"><strong>${escapeHtml(view.invoice.holderLabel)}:</strong> ${escapeHtml(view.invoice.holderValue)}</p>
    ${
      view.invoice.addressLabel && view.invoice.addressValue
        ? `<p style="margin:4px 0;"><strong>${escapeHtml(view.invoice.addressLabel)}:</strong> ${escapeHtml(view.invoice.addressValue)}</p>`
        : ''
    }
  </div>
      `.trim()
      : '';

    const deliveryFeeRow =
      view.deliveryFee > 0
        ? `
    <tr>
      <td style="padding:4px 8px;">Costo de envío</td>
      <td style="padding:4px 8px;text-align:right;">${formatCurrency(view.deliveryFee)}</td>
    </tr>
        `
        : '';

    return `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>Nota de pedido ${escapeHtml(view.orderReference)}</title>
</head>
<body style="font-family:Arial,sans-serif;color:#222;line-height:1.5;max-width:640px;margin:0 auto;padding:24px;">
  <h1 style="text-align:center;color:#1a1a1a;margin:0 0 8px;font-size:22px;letter-spacing:1px;">NOTA DE PEDIDO</h1>

  <p style="margin:16px 0;">Estimado(a) <strong>${escapeHtml(view.customerName)}</strong>,</p>
  <p style="margin:0 0 20px;">
    Confirmamos que hemos recibido tu solicitud de compra correctamente. A continuación, te compartimos
    el detalle de tu orden. También adjuntamos tu nota de pedido en formato PDF.
  </p>

  <div style="margin:20px 0;padding:16px;background:#f8f9fa;border:1px solid #ddd;border-radius:8px;">
    <h3 style="margin:0 0 12px;font-size:15px;color:#333;">Detalle del pedido</h3>
    <p style="margin:4px 0;"><strong>Número de pedido:</strong> ${escapeHtml(view.orderReference)}</p>
    <p style="margin:4px 0;"><strong>Fecha de registro:</strong> ${escapeHtml(view.orderDate)}</p>
    <p style="margin:4px 0;"><strong>Método de pago:</strong> ${escapeHtml(view.paymentMethodLabel)}</p>
    <p style="margin:4px 0;"><strong>Estado del pago:</strong> ${escapeHtml(view.paymentStatusLabel)}</p>
  </div>

  <div style="margin:20px 0;padding:16px;background:#f8f9fa;border:1px solid #ddd;border-radius:8px;">
    <h3 style="margin:0 0 12px;font-size:15px;color:#333;">Datos de entrega</h3>
    <p style="margin:4px 0;"><strong>Tipo de envío:</strong> ${escapeHtml(view.deliveryTypeLabel)}</p>
    <p style="margin:4px 0;"><strong>Dirección:</strong> ${escapeHtml(view.deliveryAddress)}</p>
    <p style="margin:4px 0;"><strong>Ubigeo:</strong> ${escapeHtml(view.deliveryUbigeo)}</p>
    <p style="margin:4px 0;"><strong>Contacto:</strong> ${escapeHtml(view.deliveryContact)}</p>
  </div>

  ${invoiceBlock}

  <h3 style="margin:24px 0 12px;font-size:15px;color:#333;">Resumen de productos</h3>
  <table style="width:100%;border-collapse:collapse;margin:0 0 16px;font-size:14px;">
    <thead>
      <tr style="background:#f5f5f5;">
        <th style="padding:8px;text-align:left;">Descripción del producto</th>
        <th style="padding:8px;text-align:center;">Cant.</th>
        <th style="padding:8px;text-align:right;">Precio unit.</th>
        <th style="padding:8px;text-align:right;">Total</th>
      </tr>
    </thead>
    <tbody>
      ${lineRows}
    </tbody>
  </table>

  <table style="width:100%;max-width:320px;margin-left:auto;font-size:14px;">
    <tr>
      <td style="padding:4px 8px;">Subtotal</td>
      <td style="padding:4px 8px;text-align:right;">${formatCurrency(view.subtotalProducts)}</td>
    </tr>
    ${deliveryFeeRow}
    <tr style="font-weight:bold;font-size:16px;">
      <td style="padding:8px;border-top:2px solid #222;">TOTAL (PEN)</td>
      <td style="padding:8px;border-top:2px solid #222;text-align:right;">${formatCurrency(view.grandTotal)}</td>
    </tr>
  </table>

  <div style="margin-top:28px;padding:16px;background:#fffbeb;border:1px solid #f0d58a;border-radius:8px;">
    <p style="margin:0;font-size:12px;color:#555;"><strong>Información importante (Normativa SUNAT):</strong></p>
    <p style="margin:8px 0 0;font-size:12px;color:#555;">${escapeHtml(view.legalNotice)}</p>
  </div>

  <p style="margin-top:24px;font-size:13px;color:#444;">
    Si tienes alguna duda o deseas modificar algún dato de entrega, comunícate con soporte vía WhatsApp al
    <strong>${escapeHtml(view.company.whatsappDisplay)}</strong> indicando tu número de pedido
    <strong>${escapeHtml(view.orderReference)}</strong>.
  </p>

  <p style="margin-top:32px;font-size:12px;color:#666;text-align:center;">
    ¡Gracias por tu compra en ${escapeHtml(view.company.name)}!
  </p>

  <hr style="border:none;border-top:1px solid #ddd;margin:24px 0;">

  <p style="margin:0;font-size:11px;color:#888;text-align:center;">
    ${escapeHtml(view.company.legalName)} • RUC: ${escapeHtml(view.company.ruc)} •
    <a href="${escapeHtml(view.company.website)}" style="color:#888;">${escapeHtml(view.company.website)}</a>
  </p>
</body>
</html>
    `.trim();
  }
}
