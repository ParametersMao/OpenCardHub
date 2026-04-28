import { Body, Controller, Get, Headers, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { AdminGuard } from '../auth/admin.guard';
import { AdminPermissionGuard } from '../auth/admin-permission.guard';
import { ADMIN_PERMISSIONS } from '../auth/admin-permissions';
import { RequireAdminPermission } from '../auth/require-admin-permission.decorator';
import { BindDomainDto } from './dto/bind-domain.dto';
import { CreateSiteDto } from './dto/create-site.dto';
import { UpdateSiteDto } from './dto/update-site.dto';
import { SiteService } from './site.service';

@UseGuards(AdminGuard, AdminPermissionGuard)
@RequireAdminPermission(ADMIN_PERMISSIONS.sitesManage)
@Controller('sites')
export class SiteController {
  constructor(private readonly siteService: SiteService) {}

  @Get()
  listSites() {
    return this.siteService.listSites();
  }

  @Post()
  createSite(@Body() input: CreateSiteDto) {
    return this.siteService.createSite(input);
  }

  @Patch(':id')
  updateSite(@Param('id') id: string, @Body() input: UpdateSiteDto) {
    return this.siteService.updateSite(id, input);
  }

  @Post('domains')
  bindDomain(@Body() input: BindDomainDto) {
    return this.siteService.bindDomain(input);
  }

  @Get('resolve')
  resolveByHost(
    @Query('host') queryHost?: string,
    @Headers('host') headerHost?: string,
  ) {
    return this.siteService.resolveByHost(queryHost ?? headerHost ?? '');
  }
}
