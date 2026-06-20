import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MailService } from './mail.service';

export interface SetPasswordEmailOptions {
  orderReference?: string;
  useAdminFrontend?: boolean;
}

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
    options?: SetPasswordEmailOptions,
  ): Promise<void> {
    const useAdminFrontend = options?.useAdminFrontend ?? false;
    const frontendUrl = useAdminFrontend
      ? this.getAdminFrontendUrl()
      : this.getFrontendUrl();
    const setupPath = useAdminFrontend
      ? '/auth/establecer-contrasena'
      : '/establecer-contrasena';
    const companyName = this.configService.get<string>('COMPANY_NAME') ?? 'Ansur';
    const ttlHours = this.getTokenTtlHours();
    const setupUrl = `${frontendUrl}${setupPath}?token=${encodeURIComponent(rawToken)}`;
    const orderReference = options?.orderReference;

    const html = useAdminFrontend
      ? this.buildAdminHtml({ companyName, name, setupUrl, ttlHours })
      : this.buildClientHtml({ companyName, name, setupUrl, ttlHours, orderReference });

    const subject = orderReference
      ? `Activa tu cuenta - Pedido ${orderReference} - ${companyName}`
      : useAdminFrontend
      ? `Activa tu cuenta administrativa - ${companyName}`
      : `Activa tu cuenta - ${companyName}`;

    await this.mailService.sendHtmlEmail(email, subject, html);
    this.logger.log(`Correo de activación enviado → ${email}`);
  }

  private buildClientHtml(params: {
    companyName: string;
    name: string;
    setupUrl: string;
    ttlHours: number;
    orderReference?: string;
  }): string {
    const orderLine = params.orderReference
      ? `<p style="margin:4px 0;">Tu pedido <strong>${this.escapeHtml(params.orderReference)}</strong> fue confirmado.</p>`
      : '';

    return `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>Activa tu cuenta - ${this.escapeHtml(params.companyName)}</title>
</head>
<body style="font-family:Arial,sans-serif;color:#222;line-height:1.5;max-width:640px;margin:0 auto;padding:24px;">
  <h1 style="color:#1a1a1a;margin-bottom:8px;">${this.escapeHtml(params.companyName)}</h1>
  <h2 style="margin-top:0;">Activa tu cuenta</h2>
  <p>Hola ${this.escapeHtml(params.name)},</p>
  ${orderLine}
  <p>Crea tu contraseña para acceder a <strong>Mis pedidos</strong> y futuras compras.</p>
  <p style="margin:24px 0;">
    <a href="${params.setupUrl}"
       style="display:inline-block;background:#f82727;color:#fff;text-decoration:none;padding:12px 24px;border-radius:6px;font-weight:bold;">
      Crear mi contraseña
    </a>
  </p>
  <p style="font-size:13px;color:#555;">Este enlace expira en ${params.ttlHours} horas.</p>
  <p style="font-size:12px;color:#888;">Si no realizaste esta compra, puedes ignorar este correo.</p>
</body>
</html>
    `.trim();
  }

  private buildAdminHtml(params: {
    companyName: string;
    name: string;
    setupUrl: string;
    ttlHours: number;
  }): string {
    return `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>Activa tu cuenta administrativa - ${this.escapeHtml(params.companyName)}</title>
</head>
<body style="font-family:Arial,sans-serif;color:#222;line-height:1.5;max-width:640px;margin:0 auto;padding:24px;">
  <h1 style="color:#1a1a1a;margin-bottom:8px;">${this.escapeHtml(params.companyName)}</h1>
  <h2 style="margin-top:0;">Activa tu cuenta administrativa</h2>
  <p>Hola ${this.escapeHtml(params.name)},</p>
  <p>Se creó tu acceso al <strong>panel administrativo</strong>. Crea tu contraseña para iniciar sesión.</p>
  <p style="margin:24px 0;">
    <a href="${params.setupUrl}"
       style="display:inline-block;background:#2563eb;color:#fff;text-decoration:none;padding:12px 24px;border-radius:6px;font-weight:bold;">
      Crear mi contraseña
    </a>
  </p>
  <p style="font-size:13px;color:#555;">Este enlace expira en ${params.ttlHours} horas.</p>
  <p style="font-size:12px;color:#888;">Si no esperabas este correo, contacta al super administrador.</p>
</body>
</html>
    `.trim();
  }

  private getFrontendUrl(): string {
    const url = this.configService.get<string>('FRONTEND_URL') ?? 'http://localhost:4200';
    return url.replace(/\/$/, '');
  }

  private getAdminFrontendUrl(): string {
    const url =
      this.configService.get<string>('ADMIN_FRONTEND_URL') ?? 'http://localhost:4201';
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
