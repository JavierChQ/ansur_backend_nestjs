import { Controller, UseGuards, Put, Param, Body, ParseIntPipe, Post, Get, Delete } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt/jwt-auth.guard';
import { PermissionsGuard } from '../auth/jwt/permissions.guard';
import { RequirePermissions } from '../auth/jwt/require-permissions';
import { AddressService } from './address.service';
import { CreateAddressDto } from './dto/create-address.dto';
import { UpdateAddressDto } from './dto/update-address.dto';
import { ApiTags } from '@nestjs/swagger';
import { PermissionCode } from '../permissions/permissions.constants';

@ApiTags('address')
@Controller('address')
export class AddressController {

    constructor(private addressService: AddressService) {}

    @RequirePermissions(PermissionCode.SHOP_ADDRESS)
    @UseGuards(JwtAuthGuard, PermissionsGuard)
    @Post()
    create(@Body() address: CreateAddressDto) {
        return this.addressService.create(address);
    }
    
    @RequirePermissions(PermissionCode.SHOP_ADDRESS)
    @UseGuards(JwtAuthGuard, PermissionsGuard)
    @Get()
    findAll() {
        return this.addressService.findAll();
    }
    
    @RequirePermissions(PermissionCode.SHOP_ADDRESS)
    @UseGuards(JwtAuthGuard, PermissionsGuard)
    @Get('user/:id_user')
    findByUser(@Param('id_user', ParseIntPipe) id_user: number) {
        return this.addressService.findByUser(id_user);
    }

    @RequirePermissions(PermissionCode.SHOP_ADDRESS)
    @UseGuards(JwtAuthGuard, PermissionsGuard)
    @Put(':id')
    update(@Param('id', ParseIntPipe) id: number, @Body() address: UpdateAddressDto) {
        return this.addressService.update(id, address);
    }
    
    @RequirePermissions(PermissionCode.SHOP_ADDRESS)
    @UseGuards(JwtAuthGuard, PermissionsGuard)
    @Delete(':id')
    delete(@Param('id', ParseIntPipe) id: number) {
        return this.addressService.delete(id);
    }

}
