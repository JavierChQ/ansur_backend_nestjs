import { ApiProperty } from '@nestjs/swagger';

export class WhatsappPaymentIntentResponseDto {
  @ApiProperty({ example: 45 })
  order_id: number;

  @ApiProperty({ example: 'K7M2P9' })
  reference_code: string;

  @ApiProperty({ example: 245.5 })
  amount: number;

  @ApiProperty({ example: '2026-06-23T14:30:00.000Z' })
  expires_at: Date;

  @ApiProperty({ example: 'whatsapp' })
  payment_channel: string;

  @ApiProperty({ example: '2026-06-23T12:30:00.000Z' })
  whatsapp_intent_at: Date;

  @ApiProperty()
  message: string;

  @ApiProperty({ example: 'https://wa.me/51929374092?text=...' })
  whatsapp_url: string;
}
