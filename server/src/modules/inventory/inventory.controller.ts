import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { AdminGuard } from '../auth/admin.guard';
import { ImportCardsDto } from './dto/import-cards.dto';
import { LockCardsDto } from './dto/lock-cards.dto';
import { InventoryService } from './inventory.service';

@UseGuards(AdminGuard)
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
