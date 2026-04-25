import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import type { AuthUser } from '../auth/auth.types';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CreateWithdrawalDto } from './dto/create-withdrawal.dto';
import { FinanceService } from './finance.service';

interface AuthenticatedRequest {
  user: AuthUser;
}

@UseGuards(JwtAuthGuard)
@Controller('agent/finance')
export class AgentFinanceController {
  constructor(private readonly financeService: FinanceService) {}

  @Get('summary')
  getSummary(@Req() request: AuthenticatedRequest) {
    return this.financeService.getAgentSummary(request.user);
  }

  @Get('transactions')
  listTransactions(@Req() request: AuthenticatedRequest) {
    return this.financeService.listAgentTransactions(request.user);
  }

  @Get('withdrawals')
  listWithdrawals(@Req() request: AuthenticatedRequest) {
    return this.financeService.listAgentWithdrawals(request.user);
  }

  @Post('withdrawals')
  createWithdrawal(
    @Req() request: AuthenticatedRequest,
    @Body() input: CreateWithdrawalDto,
  ) {
    return this.financeService.createWithdrawal(request.user, input);
  }
}
