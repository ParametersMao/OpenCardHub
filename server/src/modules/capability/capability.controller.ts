import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Put,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { AuthUser } from '../auth/auth.types';
import { AdminGuard } from '../auth/admin.guard';
import { AdminPermissionGuard } from '../auth/admin-permission.guard';
import { ADMIN_PERMISSIONS } from '../auth/admin-permissions';
import { RequireAdminPermission } from '../auth/require-admin-permission.decorator';
import {
  CAPABILITY_KEYS,
  type CapabilityKey,
  type LevelCode,
} from './capability.constants';
import { CapabilityService } from './capability.service';
import { UpdateLevelCapabilityDto } from './dto/update-level-capability.dto';

interface AuthenticatedRequest {
  user: AuthUser;
  ip?: string;
  headers: Record<string, string | string[] | undefined>;
}

@UseGuards(AdminGuard, AdminPermissionGuard)
@RequireAdminPermission(ADMIN_PERMISSIONS.capabilitiesManage)
@Controller('capabilities')
export class CapabilityController {
  constructor(private readonly capabilityService: CapabilityService) {}

  @Get('levels')
  getLevels() {
    return this.capabilityService.listLevelTemplates();
  }

  @Get('levels/persisted')
  getPersistedLevels() {
    return this.capabilityService.listPersistedLevelTemplates();
  }

  @Post('levels/bootstrap')
  bootstrapLevels() {
    return this.capabilityService.bootstrapDefaultLevels();
  }

  @Get('levels/:level/:capability')
  checkCapability(
    @Param('level') level: LevelCode,
    @Param('capability') capability: CapabilityKey,
  ) {
    return this.capabilityService.checkLevelCapability(level, capability);
  }

  @Put('levels/:level/:capability')
  updateCapability(
    @Param('level') level: LevelCode,
    @Param('capability') capability: CapabilityKey,
    @Body() input: UpdateLevelCapabilityDto,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.capabilityService.updateLevelCapability(
      level,
      capability,
      input,
      this.createAuditContext(request),
    );
  }

  @Get('keys')
  getCapabilityKeys() {
    return Object.values(CAPABILITY_KEYS);
  }

  private createAuditContext(request: AuthenticatedRequest) {
    return {
      operator: request.user,
      ip: this.getHeaderValue(request, 'x-forwarded-for') ?? request.ip,
      userAgent: this.getHeaderValue(request, 'user-agent'),
    };
  }

  private getHeaderValue(request: AuthenticatedRequest, key: string) {
    const value = request.headers[key];
    return Array.isArray(value) ? value[0] : value;
  }
}
