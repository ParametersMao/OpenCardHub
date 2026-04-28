import {
  Body,
  Controller,
  Get,
  Header,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { AuthUser } from '../auth/auth.types';
import { AdminGuard } from '../auth/admin.guard';
import { AdminPermissionGuard } from '../auth/admin-permission.guard';
import { ADMIN_PERMISSIONS } from '../auth/admin-permissions';
import { RequireAdminPermission } from '../auth/require-admin-permission.decorator';
import { AuditLogQueryDto } from './dto/audit-log-query.dto';
import { CreateSettlementDto } from './dto/create-settlement.dto';
import { ReportQueryDto } from './dto/report-query.dto';
import { ReviewSettlementDto } from './dto/review-settlement.dto';
import { SettlementDetailsQueryDto } from './dto/settlement-details-query.dto';
import { ReviewWithdrawalDto } from './dto/review-withdrawal.dto';
import { FinanceService } from './finance.service';

interface AuthenticatedRequest {
  user: AuthUser;
  ip?: string;
  headers: Record<string, string | string[] | undefined>;
}

@UseGuards(AdminGuard, AdminPermissionGuard)
@RequireAdminPermission(ADMIN_PERMISSIONS.financeView)
@Controller('finance')
export class FinanceController {
  constructor(private readonly financeService: FinanceService) {}

  @Get('withdrawals')
  listWithdrawals() {
    return this.financeService.listWithdrawals();
  }

  @Get('summary')
  getSummary() {
    return this.financeService.getAdminSummary();
  }

  @Get('settlements')
  listSettlements() {
    return this.financeService.listSettlements();
  }

  @Get('settlements/:id/details')
  getSettlementDetails(
    @Param('id') id: string,
    @Query() query: SettlementDetailsQueryDto,
  ) {
    return this.financeService.getSettlementDetails(id, query);
  }

  @Get('audit-logs')
  listAuditLogs(@Query() query: AuditLogQueryDto) {
    return this.financeService.listAuditLogs(query);
  }

  @Get('settlements/export')
  @Header('Content-Type', 'text/csv; charset=utf-8')
  @Header('Content-Disposition', 'attachment; filename="settlements.csv"')
  exportSettlements() {
    return this.financeService.exportSettlementsCsv();
  }

  @Patch('settlements/:id')
  @RequireAdminPermission(ADMIN_PERMISSIONS.financeReview)
  reviewSettlement(
    @Param('id') id: string,
    @Body() input: ReviewSettlementDto,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.financeService.reviewSettlement(
      id,
      input,
      this.createAuditContext(request),
    );
  }

  @Post('settlements')
  @RequireAdminPermission(ADMIN_PERMISSIONS.financeReview)
  createSettlement(
    @Body() input: CreateSettlementDto,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.financeService.createSettlement(
      input,
      this.createAuditContext(request),
    );
  }

  @Get('reports/summary')
  getReportSummary(@Query() query: ReportQueryDto) {
    return this.financeService.getAdminReportSummary(query);
  }

  @Patch('withdrawals/:id')
  @RequireAdminPermission(ADMIN_PERMISSIONS.financeReview)
  reviewWithdrawal(
    @Param('id') id: string,
    @Body() input: ReviewWithdrawalDto,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.financeService.reviewWithdrawal(
      id,
      input,
      this.createAuditContext(request),
    );
  }

  private createAuditContext(request: AuthenticatedRequest) {
    return {
      operator: request.user,
      ip: this.getHeaderValue(request, 'x-forwarded-for') ?? request.ip,
      userAgent: this.getHeaderValue(request, 'user-agent'),
    };
  }

  private getHeaderValue(request: AuthenticatedRequest, key: string) {
    const value = request.headers[key];
    return Array.isArray(value) ? value[0] : value;
  }
}
