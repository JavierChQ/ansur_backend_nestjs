import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MailService } from './mail.service';

@Injectable()
export class PasswordResetMailService {
  private readonly logger = new Logger(PasswordResetMailService.name);

  constructor(
    private readonly mailService: MailService,
    private readonly configService: ConfigService,
  ) {}

  async sendResetPasswordEmail(
    email: string,
    name: string,
    rawToken: string,
    options?: { useAdminFrontend?: boolean },
  ): Promise<void> {
    const frontendUrl = options?.useAdminFrontend
      ? this.getAdminFrontendUrl()
      : this.getFrontendUrl();
    const resetPath = options?.useAdminFrontend
      ? '/auth/restablecer-contrasena'
      : '/restablecer-contrasena';
    const companyName = this.configService.get<string>('COMPANY_NAME') ?? 'Ansur';
    const ttlHours = this.getTokenTtlHours();
    const resetUrl = `${frontendUrl}${resetPath}?token=${encodeURIComponent(rawToken)}`;

    const html = `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>Restablece tu contraseña - ${this.escapeHtml(companyName)}</title>
</head>
<body style="font-family:Arial,sans-serif;color:#222;line-height:1.5;max-width:640px;margin:0 auto;padding:24px;">
  <h1 style="color:#1a1a1a;margin-bottom:8px;">${this.escapeHtml(companyName)}</h1>
  <h2 style="margin-top:0;">Restablece tu contraseña</h2>
  <p>Hola ${this.escapeHtml(name)},</p>
  <p>Recibimos una solicitud para restablecer la contraseña de tu cuenta.</p>
  <p style="margin:24px 0;">
    <a href="${resetUrl}"
       style="display:inline-block;background:#f82727;color:#fff;text-decoration:none;padding:12px 24px;border-radius:6px;font-weight:bold;">
      Restablecer contraseña
    </a>
  </p>
  <p style="font-size:13px;color:#555;">Este enlace expira en ${ttlHours} hora(s).</p>
  <p style="font-size:12px;color:#888;">Si no solicitaste este cambio, puedes ignorar este correo. Tu contraseña no se modificará.</p>
</body>
</html>
    `.trim();

    const subject = `Restablece tu contraseña - ${companyName}`;

    await this.mailService.sendHtmlEmail(email, subject, html);
    this.logger.log(`Correo de recuperación enviado → ${email}`);
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
    const raw = this.configService.get<string>('PASSWORD_RESET_TOKEN_TTL_HOURS');
    const parsed = raw ? Number(raw) : 1;
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
  }

  private escapeHtml(value: string): string {
    return value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }
}
