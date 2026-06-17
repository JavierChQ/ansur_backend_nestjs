import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MailService } from './mail.service';

@Injectable()
export class AccountActivationService {
  private readonly logger = new Logger(AccountActivationService.name);

  constructor(
    private readonly mailService: MailService,
    private readonly configService: ConfigService,
  ) {}

  async sendSetPasswordEmail(
    email: string,
    name: string,
    rawToken: string,
    orderReference?: string,
  ): Promise<void> {
    const frontendUrl = this.getFrontendUrl();
    const companyName = this.configService.get<string>('COMPANY_NAME') ?? 'Ansur';
    const ttlHours = this.getTokenTtlHours();
    const setupUrl = `${frontendUrl}/establecer-contrasena?token=${encodeURIComponent(rawToken)}`;
    const orderLine = orderReference
      ? `<p style="margin:4px 0;">Tu pedido <strong>${this.escapeHtml(orderReference)}</strong> fue confirmado.</p>`
      : '';

    const html = `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>Activa tu cuenta - ${this.escapeHtml(companyName)}</title>
</head>
<body style="font-family:Arial,sans-serif;color:#222;line-height:1.5;max-width:640px;margin:0 auto;padding:24px;">
  <h1 style="color:#1a1a1a;margin-bottom:8px;">${this.escapeHtml(companyName)}</h1>
  <h2 style="margin-top:0;">Activa tu cuenta</h2>
  <p>Hola ${this.escapeHtml(name)},</p>
  ${orderLine}
  <p>Crea tu contraseña para acceder a <strong>Mis pedidos</strong> y futuras compras.</p>
  <p style="margin:24px 0;">
    <a href="${setupUrl}"
       style="display:inline-block;background:#f82727;color:#fff;text-decoration:none;padding:12px 24px;border-radius:6px;font-weight:bold;">
      Crear mi contraseña
    </a>
  </p>
  <p style="font-size:13px;color:#555;">Este enlace expira en ${ttlHours} horas.</p>
  <p style="font-size:12px;color:#888;">Si no realizaste esta compra, puedes ignorar este correo.</p>
</body>
</html>
    `.trim();

    const subject = orderReference
      ? `Activa tu cuenta - Pedido ${orderReference} - ${companyName}`
      : `Activa tu cuenta - ${companyName}`;

    await this.mailService.sendHtmlEmail(email, subject, html);
    this.logger.log(`Correo de activación enviado → ${email}`);
  }

  private getFrontendUrl(): string {
    const url = this.configService.get<string>('FRONTEND_URL') ?? 'http://localhost:4200';
    return url.replace(/\/$/, '');
  }

  private getTokenTtlHours(): number {
    const raw = this.configService.get<string>('PASSWORD_SETUP_TOKEN_TTL_HOURS');
    const parsed = raw ? Number(raw) : 72;
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 72;
  }

  private escapeHtml(value: string): string {
    return value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }
}
