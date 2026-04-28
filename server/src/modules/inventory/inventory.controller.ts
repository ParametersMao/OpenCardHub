import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { AdminGuard } from '../auth/admin.guard';
import { AdminPermissionGuard } from '../auth/admin-permission.guard';
import { ADMIN_PERMISSIONS } from '../auth/admin-permissions';
import { RequireAdminPermission } from '../auth/require-admin-permission.decorator';
import { ImportCardsDto } from './dto/import-cards.dto';
import { LockCardsDto } from './dto/lock-cards.dto';
import { InventoryService } from './inventory.service';

@UseGuards(AdminGuard, AdminPermissionGuard)
@RequireAdminPermission(ADMIN_PERMISSIONS.inventoryManage)
@Controller('inventory')
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  @Post('cards/import')
  importCards(@Body() input: ImportCardsDto) {
    return this.inventoryService.importCards(input);
  }

  @Get('products/:productId/cards')
  listProductCards(@Param('productId') productId: string) {
    return this.inventoryService.listProductCards(productId);
  }

  @Get('products/:productId/stock')
  getProductStock(@Param('productId') productId: string) {
    return this.inventoryService.getProductStock(productId);
  }

  @Post('cards/lock')
  lockCards(@Body() input: LockCardsDto) {
    return this.inventoryService.lockCards(input);
  }
}
