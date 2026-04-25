import { Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { AdminGuard } from '../auth/admin.guard';
import {
  CAPABILITY_KEYS,
  type CapabilityKey,
  type LevelCode,
} from './capability.constants';
import { CapabilityService } from './capability.service';

@UseGuards(AdminGuard)
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

  @Get('keys')
  getCapabilityKeys() {
    return Object.values(CAPABILITY_KEYS);
  }
}
