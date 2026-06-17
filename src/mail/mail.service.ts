import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';

export interface EmailAttachment {
  filename: string;
  content: Buffer | string;
  contentType?: string;
  contentId?: string;
}

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private readonly resend: Resend | null;
  private readonly from: string;

  constructor(private readonly configService: ConfigService) {
    const apiKey = this.configService.get<string>('RESEND_API_KEY');
    this.from =
      this.configService.get<string>('MAIL_FROM') ?? 'Ansur <onboarding@resend.dev>';
    this.resend = apiKey ? new Resend(apiKey) : null;

    if (!apiKey) {
      this.logger.warn('RESEND_API_KEY no configurada; los correos no se enviarán.');
    }
  }

  async sendHtmlEmail(to: string, subject: string, html: string): Promise<void> {
    await this.sendHtmlEmailWithAttachments(to, subject, html, []);
  }

  async sendHtmlEmailWithAttachments(
    to: string,
    subject: string,
    html: string,
    attachments: EmailAttachment[],
  ): Promise<void> {
    if (!this.resend) {
      this.logger.warn(`Correo omitido (sin API key): ${subject} → ${to}`);
      return;
    }

    const { error } = await this.resend.emails.send({
      from: this.from,
      to,
      subject,
      html,
      attachments: attachments.map((attachment) => ({
        filename: attachment.filename,
        content: Buffer.isBuffer(attachment.content)
          ? attachment.content.toString('base64')
          : attachment.content,
        content_type: attachment.contentType,
        content_id: attachment.contentId,
      })),
    });

    if (error) {
      this.logger.error(`Error al enviar correo a ${to}: ${error.message}`);
      throw new Error(error.message);
    }
  }
}
