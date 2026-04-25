import { Controller, Get, Param } from '@nestjs/common';
import { CAPABILITY_KEYS, type CapabilityKey, type LevelCode } from './capability.constants';
import { CapabilityService } from './capability.service';

@Controller('capabilities')
export class CapabilityController {
  constructor(private readonly capabilityService: CapabilityService) {}

  @Get('levels')
  getLevels() {
    return this.capabilityService.listLevelTemplates();
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
