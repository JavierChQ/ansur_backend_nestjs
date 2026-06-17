import { Injectable } from '@nestjs/common';
import { formatCurrency } from '../utils/tax.util';
import { OrderReceiptLine, OrderReceiptView } from './order-receipt.types';

// pdfkit es CommonJS; require evita problemas de default export en runtime/tests.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const PDFDocument = require('pdfkit') as typeof import('pdfkit');

type PdfDocument = InstanceType<typeof PDFDocument>;

@Injectable()
export class OrderReceiptPdfGenerator {
  async generate(view: OrderReceiptView): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ size: 'A4', margin: 50 });
      const chunks: Buffer[] = [];

      doc.on('data', (chunk: Buffer) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      this.renderOrderDetails(doc, view);
      doc.addPage();
      this.renderLegalSection(doc, view);

      doc.end();
    });
  }

  private renderOrderDetails(doc: PdfDocument, view: OrderReceiptView): void {
    doc.fontSize(18).font('Helvetica-Bold').text('NOTA DE PEDIDO', { align: 'center' });
    doc.moveDown(1.5);

    doc.fontSize(11).font('Helvetica');
    doc.text(`Estimado(a) ${view.customerName},`);
    doc.moveDown(0.5);
    doc.text(
      'Confirmamos que hemos recibido tu solicitud de compra correctamente. A continuación, te compartimos el documento descriptivo con todos los detalles de tu orden.',
      { align: 'justify' },
    );
    doc.moveDown(1.2);

    this.renderSectionTitle(doc, 'DETALLE DEL PEDIDO');
    this.renderField(doc, 'Número de Pedido', view.orderReference);
    this.renderField(doc, 'Fecha de Registro', view.orderDate);
    this.renderField(doc, 'Método de Pago', view.paymentMethodLabel);
    this.renderField(doc, 'Estado del Pago', view.paymentStatusLabel);
    doc.moveDown(0.8);

    this.renderSectionTitle(doc, 'DATOS DE ENTREGA');
    this.renderField(doc, 'Tipo de Envío', view.deliveryTypeLabel);
    this.renderField(doc, 'Dirección', view.deliveryAddress);
    this.renderField(doc, 'Ubigeo', view.deliveryUbigeo);
    this.renderField(doc, 'Contacto', view.deliveryContact);
    doc.moveDown(0.8);

    if (view.invoice) {
      this.renderSectionTitle(doc, 'DATOS PARA TU COMPROBANTE');
      this.renderField(doc, 'Tipo solicitado', view.invoice.typeLabel);
      this.renderField(doc, 'Documento', view.invoice.documentLabel);
      this.renderField(doc, view.invoice.holderLabel, view.invoice.holderValue);
      if (view.invoice.addressLabel && view.invoice.addressValue) {
        this.renderField(doc, view.invoice.addressLabel, view.invoice.addressValue);
      }
      doc.moveDown(0.8);
    }

    this.renderSectionTitle(doc, 'RESUMEN DE PRODUCTOS');
    this.renderProducts(doc, view);
    this.renderTotals(doc, view);
  }

  private renderLegalSection(doc: PdfDocument, view: OrderReceiptView): void {
    doc.fontSize(12).font('Helvetica-Bold').text('Información Importante (Normativa SUNAT):');
    doc.moveDown(0.5);
    doc.fontSize(10).font('Helvetica').text(view.legalNotice, { align: 'justify' });
    doc.moveDown(2);

    doc.fontSize(11).font('Helvetica').text(
      `Si tienes alguna duda o deseas modificar algún dato de entrega, comunícate con soporte vía WhatsApp al ${view.company.whatsappDisplay} indicando tu número de pedido ${view.orderReference}.`,
      { align: 'justify' },
    );
    doc.moveDown(3);

    doc.fontSize(10).text(`¡Gracias por tu compra en ${view.company.name}!`, { align: 'center' });
    doc.moveDown(2);

    doc
      .fontSize(9)
      .fillColor('#444')
      .text(`${view.company.legalName} • RUC: ${view.company.ruc} • ${view.company.website}`, {
        align: 'center',
      });
    doc.fillColor('#000');
  }

  private renderSectionTitle(doc: PdfDocument, title: string): void {
    doc.fontSize(11).font('Helvetica-Bold').text(title);
    doc.moveDown(0.3);
  }

  private renderField(doc: PdfDocument, label: string, value: string): void {
    doc.fontSize(10).font('Helvetica-Bold').text(`${label}: `, { continued: true });
    doc.font('Helvetica').text(value);
  }

  private renderProducts(doc: PdfDocument, view: OrderReceiptView): void {
    doc.moveDown(0.4);
    doc.fontSize(9).font('Helvetica-Bold');
    doc.text('Descripción del Producto');
    doc.text('Cant.    Precio Unit.    Total', { align: 'right' });
    doc.moveDown(0.3);
    doc
      .moveTo(doc.page.margins.left, doc.y)
      .lineTo(doc.page.width - doc.page.margins.right, doc.y)
      .strokeColor('#cccccc')
      .stroke();
    doc.moveDown(0.4);

    for (const line of view.lines) {
      this.renderProductLine(doc, line);
      doc
        .moveTo(doc.page.margins.left, doc.y)
        .lineTo(doc.page.width - doc.page.margins.right, doc.y)
        .strokeColor('#eeeeee')
        .stroke();
      doc.moveDown(0.4);
    }
  }

  private renderProductLine(doc: PdfDocument, line: OrderReceiptLine): void {
    doc.fontSize(9).font('Helvetica-Bold').text(line.description);
    doc.font('Helvetica').text(
      `${line.quantity}    ${formatCurrency(line.unitPrice)}    ${formatCurrency(line.lineTotal)}`,
      { align: 'right' },
    );
    doc.moveDown(0.2);
  }

  private renderTotals(doc: PdfDocument, view: OrderReceiptView): void {
    doc.moveDown(0.6);
    doc.fontSize(10).font('Helvetica');
    doc.text(`Subtotal: ${formatCurrency(view.subtotalProducts)}`, { align: 'right' });

    if (view.deliveryFee > 0) {
      doc.text(`Costo de Envío: ${formatCurrency(view.deliveryFee)}`, { align: 'right' });
    }

    doc.font('Helvetica-Bold').fontSize(11);
    doc.text(`TOTAL (PEN): ${formatCurrency(view.grandTotal)}`, { align: 'right' });
  }
}
