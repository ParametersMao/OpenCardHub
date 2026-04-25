import { Body, Controller, Get, Headers, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { AdminGuard } from '../auth/admin.guard';
import { BindDomainDto } from './dto/bind-domain.dto';
import { CreateSiteDto } from './dto/create-site.dto';
import { UpdateSiteDto } from './dto/update-site.dto';
import { SiteService } from './site.service';

@UseGuards(AdminGuard)
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
