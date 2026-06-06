import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiConflictResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { HasRoles } from '../auth/jwt/has-roles';
import { JwtRole } from '../auth/jwt/jwt-role';
import { JwtAuthGuard } from '../auth/jwt/jwt-auth.guard';
import { JwtRolesGuard } from '../auth/jwt/jwt-roles.guard';
import { ApiProtected } from '../common/decorators/api-protected.decorator';
import { InventoryService } from './inventory.service';
import { RestockDto } from './dto/restock.dto';
import { AdjustStockDto } from './dto/adjust-stock.dto';
import { UpdateMinStockDto } from './dto/update-min-stock.dto';
import { StockMovementType } from './enums/stock-movement-type.enum';
import {
  InventoryAdminResponseDto,
  StockMovementResponseDto,
  StockSummaryResponseDto,
} from './dto/swagger/inventory-response.dto';

@ApiTags('admin-inventory')
@ApiProtected()
@Controller('admin')
export class InventoryController {
  constructor(private inventoryService: InventoryService) {}

  @HasRoles(JwtRole.ADMIN)
  @UseGuards(JwtAuthGuard, JwtRolesGuard)
  @Get('inventory')
  @ApiOperation({ summary: 'Listar inventario completo con alertas de stock' })
  @ApiOkResponse({ type: [InventoryAdminResponseDto] })
  findAll() {
    return this.inventoryService.findAllAdmin();
  }

  @HasRoles(JwtRole.ADMIN)
  @UseGuards(JwtAuthGuard, JwtRolesGuard)
  @Get('inventory/low-stock')
  @ApiOperation({ summary: 'Productos con stock disponible en o por debajo del mínimo' })
  @ApiOkResponse({ type: [InventoryAdminResponseDto] })
  findLowStock() {
    return this.inventoryService.findLowStock();
  }

  @HasRoles(JwtRole.ADMIN)
  @UseGuards(JwtAuthGuard, JwtRolesGuard)
  @Get('inventory/:productId')
  @ApiOperation({ summary: 'Detalle de inventario de un producto' })
  @ApiParam({ name: 'productId', example: 12 })
  @ApiOkResponse({ type: InventoryAdminResponseDto })
  @ApiNotFoundResponse({ description: 'Producto o inventario no encontrado' })
  findOne(@Param('productId', ParseIntPipe) productId: number) {
    return this.inventoryService.getByProductId(productId).then((inv) => ({
      id_product: inv.id_product,
      name: inv.product?.name,
      quantity: inv.quantity,
      reserved: inv.reserved,
      available: inv.available,
      min_stock: inv.min_stock,
      is_low_stock: inv.is_low_stock,
      is_out_of_stock: inv.is_out_of_stock,
      updated_at: inv.updated_at,
    }));
  }

  @HasRoles(JwtRole.ADMIN)
  @UseGuards(JwtAuthGuard, JwtRolesGuard)
  @Post('inventory/:productId/restock')
  @ApiOperation({ summary: 'Ingresar mercadería al almacén' })
  @ApiParam({ name: 'productId', example: 12 })
  @ApiOkResponse({ type: InventoryAdminResponseDto })
  @ApiNotFoundResponse({ description: 'Producto no encontrado' })
  restock(
    @Param('productId', ParseIntPipe) productId: number,
    @Body() dto: RestockDto,
    @Req() req: { user: { userId: number } },
  ) {
    return this.inventoryService.restock(productId, dto, req.user.userId);
  }

  @HasRoles(JwtRole.ADMIN)
  @UseGuards(JwtAuthGuard, JwtRolesGuard)
  @Patch('inventory/:productId/min-stock')
  @ApiOperation({ summary: 'Configurar umbral de stock mínimo para alertas' })
  @ApiParam({ name: 'productId', example: 12 })
  @ApiOkResponse({ type: InventoryAdminResponseDto })
  updateMinStock(
    @Param('productId', ParseIntPipe) productId: number,
    @Body() dto: UpdateMinStockDto,
  ) {
    return this.inventoryService.updateMinStock(productId, dto.min_stock);
  }

  @HasRoles(JwtRole.ADMIN)
  @UseGuards(JwtAuthGuard, JwtRolesGuard)
  @Post('inventory/:productId/adjust')
  @ApiOperation({ summary: 'Ajuste manual de stock con motivo obligatorio' })
  @ApiParam({ name: 'productId', example: 12 })
  @ApiOkResponse({ type: InventoryAdminResponseDto })
  @ApiConflictResponse({ description: 'Stock insuficiente para ajuste negativo' })
  adjust(
    @Param('productId', ParseIntPipe) productId: number,
    @Body() dto: AdjustStockDto,
    @Req() req: { user: { userId: number } },
  ) {
    return this.inventoryService.adjust(productId, dto, req.user.userId);
  }

  @HasRoles(JwtRole.ADMIN)
  @UseGuards(JwtAuthGuard, JwtRolesGuard)
  @Get('stock-movements')
  @ApiOperation({ summary: 'Historial de movimientos de stock (auditoría)' })
  @ApiQuery({ name: 'id_product', required: false, example: 12 })
  @ApiQuery({ name: 'type', required: false, enum: StockMovementType })
  @ApiQuery({ name: 'limit', required: false, example: 100 })
  @ApiOkResponse({ type: [StockMovementResponseDto] })
  getMovements(
    @Query('id_product') id_product?: string,
    @Query('type') type?: StockMovementType,
    @Query('limit') limit?: string,
  ) {
    return this.inventoryService.getMovements({
      id_product: id_product ? parseInt(id_product, 10) : undefined,
      type,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
  }

  @HasRoles(JwtRole.ADMIN)
  @UseGuards(JwtAuthGuard, JwtRolesGuard)
  @Get('dashboard/stock-summary')
  @ApiOperation({ summary: 'Resumen de KPIs de inventario para el panel admin' })
  @ApiOkResponse({ type: StockSummaryResponseDto })
  getStockSummary() {
    return this.inventoryService.getStockSummary();
  }
}
