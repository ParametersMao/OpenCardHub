import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { AuthUser } from '../auth/auth.types';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { BindDomainDto } from './dto/bind-domain.dto';
import { CreateMySiteDto } from './dto/create-my-site.dto';
import { UpdateMySiteDto } from './dto/update-my-site.dto';
import { SiteService } from './site.service';

interface AuthenticatedRequest {
  user: AuthUser;
}

@UseGuards(JwtAuthGuard)
@Controller('agent/sites')
export class AgentSiteController {
  constructor(private readonly siteService: SiteService) {}

  @Get()
  listMySites(@Req() request: AuthenticatedRequest) {
    return this.siteService.listSitesByOwner(request.user.id);
  }

  @Post()
  createMySite(
    @Req() request: AuthenticatedRequest,
    @Body() input: CreateMySiteDto,
  ) {
    return this.siteService.createSiteForOwner(request.user, input);
  }

  @Patch(':id')
  updateMySite(
    @Req() request: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() input: UpdateMySiteDto,
  ) {
    return this.siteService.updateOwnedSite(request.user.id, id, input);
  }

  @Post('domains')
  bindMyDomain(
    @Req() request: AuthenticatedRequest,
    @Body() input: BindDomainDto,
  ) {
    return this.siteService.bindOwnedDomain(request.user, input);
  }
}
