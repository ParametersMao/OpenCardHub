import { Body, Controller, Get, Param, Post, Put, UseGuards } from '@nestjs/common';
import { AdminGuard } from '../auth/admin.guard';
import {
  CAPABILITY_KEYS,
  type CapabilityKey,
  type LevelCode,
} from './capability.constants';
import { CapabilityService } from './capability.service';
import { UpdateLevelCapabilityDto } from './dto/update-level-capability.dto';

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

  @Put('levels/:level/:capability')
  updateCapability(
    @Param('level') level: LevelCode,
    @Param('capability') capability: CapabilityKey,
    @Body() input: UpdateLevelCapabilityDto,
  ) {
    return this.capabilityService.updateLevelCapability(
      level,
      capability,
      input,
    );
  }

  @Get('keys')
  getCapabilityKeys() {
    return Object.values(CAPABILITY_KEYS);
  }
}
