import { Body, Controller, Get, Post, Put, Query, UseGuards } from '@nestjs/common';
import { AdminGuard } from '../auth/admin.guard';
import { ConfigCenterService } from './config-center.service';
import { ResolveSettingDto } from './dto/resolve-setting.dto';
import { UpsertSettingDto } from './dto/upsert-setting.dto';

@UseGuards(AdminGuard)
@Controller('config')
export class ConfigCenterController {
  constructor(private readonly configCenterService: ConfigCenterService) {}

  @Get('settings')
  listSettings(
    @Query('scopeType') scopeType?: string,
    @Query('scopeId') scopeId?: string,
    @Query('group') group?: string,
  ) {
    return this.configCenterService.listSettings({
      scopeType,
      scopeId,
      group,
    });
  }

  @Put('settings')
  upsertSetting(@Body() input: UpsertSettingDto) {
    return this.configCenterService.upsertSetting(input);
  }

  @Post('resolve')
  resolveSetting(@Body() input: ResolveSettingDto) {
    return this.configCenterService.resolveSetting(input);
  }
}
