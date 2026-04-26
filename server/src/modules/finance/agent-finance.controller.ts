import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { AuthUser } from '../auth/auth.types';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CreateWithdrawalDto } from './dto/create-withdrawal.dto';
import { ReportQueryDto } from './dto/report-query.dto';
import { SettlementDetailsQueryDto } from './dto/settlement-details-query.dto';
import { FinanceService } from './finance.service';

interface AuthenticatedRequest {
  user: AuthUser;
  ip?: string;
  headers: Record<string, string | string[] | undefined>;
}

@UseGuards(JwtAuthGuard)
@Controller('agent/finance')
export class AgentFinanceController {
  constructor(private readonly financeService: FinanceService) {}

  @Get('summary')
  getSummary(@Req() request: AuthenticatedRequest) {
    return this.financeService.getAgentSummary(request.user);
  }

  @Get('reports/summary')
  getReportSummary(
    @Req() request: AuthenticatedRequest,
    @Query() query: ReportQueryDto,
  ) {
    return this.financeService.getAgentReportSummary(request.user, query);
  }

  @Get('settlements')
  listSettlements(@Req() request: AuthenticatedRequest) {
    return this.financeService.listAgentSettlements(request.user);
  }

  @Get('settlements/:id/details')
  getSettlementDetails(
    @Req() request: AuthenticatedRequest,
    @Param('id') id: string,
    @Query() query: SettlementDetailsQueryDto,
  ) {
    return this.financeService.getAgentSettlementDetails(request.user, id, query);
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
    return this.financeService.createWithdrawal(request.user, input, {
      operator: request.user,
      ip: this.getHeaderValue(request, 'x-forwarded-for') ?? request.ip,
      userAgent: this.getHeaderValue(request, 'user-agent'),
    });
  }

  private getHeaderValue(request: AuthenticatedRequest, key: string) {
    const value = request.headers[key];
    return Array.isArray(value) ? value[0] : value;
  }
}
