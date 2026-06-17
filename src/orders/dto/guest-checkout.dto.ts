import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsEmail,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Min,
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import { CheckoutInvoiceDto } from './checkout-invoice.dto';

export enum DeliveryTypeDto {
  DELIVERY = 'delivery',
  PICKUP = 'pickup',
}

export enum ReceptorTypeDto {
  YO = 'yo',
  OTRA_PERSONA = 'otra_persona',
}

export enum DocTypeDto {
  DNI = 'DNI',
  PASAPORTE = 'PASAPORTE',
  CE = 'CE',
}

export class GuestCheckoutItemDto {
  @ApiProperty({ example: 12 })
  @IsInt()
  id_product: number;

  @ApiProperty({ example: 2 })
  @IsInt()
  @Min(1)
  quantity: number;
}

export class GuestCustomerDto {
  @ApiProperty({ example: 'cliente@ejemplo.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'Juan' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: 'Pérez' })
  @IsString()
  @IsNotEmpty()
  lastname: string;

  @ApiProperty({ example: '987654321' })
  @IsString()
  @IsNotEmpty()
  phone: string;

  @ApiProperty({ enum: DocTypeDto, example: DocTypeDto.DNI })
  @IsEnum(DocTypeDto)
  doc_type: DocTypeDto;

  @ApiProperty({ example: '12345678' })
  @IsString()
  @IsNotEmpty()
  doc_number: string;
}

export class GuestReceptorDto {
  @ApiProperty({ example: 'María' })
  @IsString()
  @IsNotEmpty()
  nombres: string;

  @ApiProperty({ example: 'García' })
  @IsString()
  @IsNotEmpty()
  apellidos: string;

  @ApiProperty({ enum: DocTypeDto, example: DocTypeDto.DNI })
  @IsEnum(DocTypeDto)
  doc_type: DocTypeDto;

  @ApiProperty({ example: '87654321' })
  @IsString()
  @IsNotEmpty()
  doc_number: string;
}

export class GuestDeliveryDto {
  @ApiProperty({ enum: DeliveryTypeDto, example: DeliveryTypeDto.DELIVERY })
  @IsEnum(DeliveryTypeDto)
  type: DeliveryTypeDto;

  @ApiPropertyOptional({ example: 'Arequipa' })
  @ValidateIf((o) => o.type === DeliveryTypeDto.DELIVERY)
  @IsString()
  @IsNotEmpty()
  departamento?: string;

  @ApiPropertyOptional({ example: 'Arequipa' })
  @ValidateIf((o) => o.type === DeliveryTypeDto.DELIVERY)
  @IsString()
  @IsNotEmpty()
  provincia?: string;

  @ApiPropertyOptional({ example: 'Cercado' })
  @ValidateIf((o) => o.type === DeliveryTypeDto.DELIVERY)
  @IsString()
  @IsNotEmpty()
  distrito?: string;

  @ApiPropertyOptional({ example: 'Av. Ejemplo 123' })
  @ValidateIf((o) => o.type === DeliveryTypeDto.DELIVERY)
  @IsString()
  @IsNotEmpty()
  direccion?: string;

  @ApiPropertyOptional({ example: 'Frente al parque' })
  @ValidateIf((o) => o.type === DeliveryTypeDto.DELIVERY)
  @IsString()
  @IsNotEmpty()
  referencia?: string;

  @ApiProperty({ enum: ReceptorTypeDto, example: ReceptorTypeDto.YO })
  @IsEnum(ReceptorTypeDto)
  receptor_type: ReceptorTypeDto;

  @ApiPropertyOptional()
  @ValidateIf((o) => o.receptor_type === ReceptorTypeDto.OTRA_PERSONA)
  @ValidateNested()
  @Type(() => GuestReceptorDto)
  receptor?: GuestReceptorDto;
}

export class GuestCheckoutDto {
  @ApiProperty({ type: [GuestCheckoutItemDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => GuestCheckoutItemDto)
  items: GuestCheckoutItemDto[];

  @ApiProperty({ type: GuestCustomerDto })
  @ValidateNested()
  @Type(() => GuestCustomerDto)
  customer: GuestCustomerDto;

  @ApiProperty({ type: GuestDeliveryDto })
  @ValidateNested()
  @Type(() => GuestDeliveryDto)
  delivery: GuestDeliveryDto;

  @ApiProperty({ type: CheckoutInvoiceDto })
  @ValidateNested()
  @Type(() => CheckoutInvoiceDto)
  invoice: CheckoutInvoiceDto;
}
