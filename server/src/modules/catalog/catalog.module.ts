import { Module } from '@nestjs/common';
import { CapabilityModule } from '../capability/capability.module';
import { AgentCatalogController } from './agent-catalog.controller';
import { CatalogController } from './catalog.controller';
import { CatalogService } from './catalog.service';

@Module({
  imports: [CapabilityModule],
  controllers: [CatalogController, AgentCatalogController],
  providers: [CatalogService],
  exports: [CatalogService],
})
export class CatalogModule {}
