import { Module } from '@nestjs/common';
import { AgentFinanceController } from './agent-finance.controller';
import { FinanceController } from './finance.controller';
import { FinanceService } from './finance.service';

@Module({
  controllers: [FinanceController, AgentFinanceController],
  providers: [FinanceService],
  exports: [FinanceService],
})
export class FinanceModule {}
