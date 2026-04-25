import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { CapabilityModule } from '../capability/capability.module';
import { AgentSiteController } from './agent-site.controller';
import { SiteController } from './site.controller';
import { SiteService } from './site.service';

@Module({
  imports: [AuthModule, CapabilityModule],
  controllers: [SiteController, AgentSiteController],
  providers: [SiteService],
  exports: [SiteService],
})
export class SiteModule {}
