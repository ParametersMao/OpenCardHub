import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { AuthUser } from '../auth/auth.types';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CatalogService } from './catalog.service';
import { UpsertSiteProductDto } from './dto/upsert-site-product.dto';

interface AuthenticatedRequest {
  user: AuthUser;
}

@UseGuards(JwtAuthGuard)
@Controller('agent/catalog')
export class AgentCatalogController {
  constructor(private readonly catalogService: CatalogService) {}

  @Get('products')
  listAgentProducts() {
    return this.catalogService.listAgentAvailableProducts();
  }

  @Get('sites/:siteId/products')
  listMyResolvedSiteProducts(
    @Req() request: AuthenticatedRequest,
    @Param('siteId') siteId: string,
  ) {
    return this.catalogService.listOwnedResolvedSiteProducts(
      request.user.id,
      siteId,
    );
  }

  @Get('sites/:siteId/overrides')
  listMySiteProductOverrides(
    @Req() request: AuthenticatedRequest,
    @Param('siteId') siteId: string,
  ) {
    return this.catalogService.listOwnedSiteProductOverrides(
      request.user.id,
      siteId,
    );
  }

  @Post('site-products')
  upsertMySiteProduct(
    @Req() request: AuthenticatedRequest,
    @Body() input: UpsertSiteProductDto,
  ) {
    return this.catalogService.upsertOwnedSiteProduct(request.user, input);
  }
}
