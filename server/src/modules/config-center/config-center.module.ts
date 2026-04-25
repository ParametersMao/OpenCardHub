import { Module } from '@nestjs/common';
import { ConfigCenterController } from './config-center.controller';
import { ConfigCenterService } from './config-center.service';

@Module({
  controllers: [ConfigCenterController],
  providers: [ConfigCenterService],
  exports: [ConfigCenterService],
})
export class ConfigCenterModule {}
