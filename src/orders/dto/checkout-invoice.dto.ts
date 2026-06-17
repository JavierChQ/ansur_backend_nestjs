import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsNotEmpty,
  IsString,
  ValidateIf,
} from 'class-validator';

export enum InvoiceTypeDto {
  BOLETA = 'BOLETA',
  FACTURA = 'FACTURA',
}

export class CheckoutInvoiceDto {
  @ApiProperty({ enum: InvoiceTypeDto, example: InvoiceTypeDto.BOLETA })
  @IsEnum(InvoiceTypeDto)
  type: InvoiceTypeDto;

  @ApiProperty({
    example: '12345678',
    description: 'DNI (8 dígitos) para boleta o RUC (11 dígitos) para factura',
  })
  @IsString()
  @IsNotEmpty()
  doc_number: string;

  @ApiPropertyOptional({
    example: 'JUAN PEREZ QUISPE',
    description: 'Nombre completo devuelto por la consulta DNI (boleta)',
  })
  @ValidateIf((invoice) => invoice.type === InvoiceTypeDto.BOLETA)
  @IsString()
  @IsNotEmpty()
  holder_name?: string;

  @ApiPropertyOptional({
    example: 'EMPRESA DEMO SAC',
    description: 'Razón social devuelta por la consulta RUC (factura)',
  })
  @ValidateIf((invoice) => invoice.type === InvoiceTypeDto.FACTURA)
  @IsString()
  @IsNotEmpty()
  business_name?: string;

  @ApiPropertyOptional({
    example: 'AV. PRINCIPAL 123 LIMA LIMA LIMA',
    description: 'Domicilio fiscal devuelto por la consulta RUC (factura)',
  })
  @ValidateIf((invoice) => invoice.type === InvoiceTypeDto.FACTURA)
  @IsString()
  @IsNotEmpty()
  address?: string;
}
