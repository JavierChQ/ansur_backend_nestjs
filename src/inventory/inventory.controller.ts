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
import { ApiTags } from '@nestjs/swagger';
import { HasRoles } from '../auth/jwt/has-roles';
import { JwtRole } from '../auth/jwt/jwt-role';
import { JwtAuthGuard } from '../auth/jwt/jwt-auth.guard';
import { JwtRolesGuard } from '../auth/jwt/jwt-roles.guard';
import { InventoryService } from './inventory.service';
import { RestockDto } from './dto/restock.dto';
import { AdjustStockDto } from './dto/adjust-stock.dto';
import { UpdateMinStockDto } from './dto/update-min-stock.dto';
import { StockMovementType } from './enums/stock-movement-type.enum';

@ApiTags('admin-inventory')
@Controller('admin')
export class InventoryController {
  constructor(private inventoryService: InventoryService) {}

  @HasRoles(JwtRole.ADMIN)
  @UseGuards(JwtAuthGuard, JwtRolesGuard)
  @Get('inventory')
  findAll() {
    return this.inventoryService.findAllAdmin();
  }

  @HasRoles(JwtRole.ADMIN)
  @UseGuards(JwtAuthGuard, JwtRolesGuard)
  @Get('inventory/low-stock')
  findLowStock() {
    return this.inventoryService.findLowStock();
  }

  @HasRoles(JwtRole.ADMIN)
  @UseGuards(JwtAuthGuard, JwtRolesGuard)
  @Get('inventory/:productId')
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
  updateMinStock(
    @Param('productId', ParseIntPipe) productId: number,
    @Body() dto: UpdateMinStockDto,
  ) {
    return this.inventoryService.updateMinStock(productId, dto.min_stock);
  }

  @HasRoles(JwtRole.ADMIN)
  @UseGuards(JwtAuthGuard, JwtRolesGuard)
  @Post('inventory/:productId/adjust')
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
  getStockSummary() {
    return this.inventoryService.getStockSummary();
  }
}
