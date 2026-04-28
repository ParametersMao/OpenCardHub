import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AdminGuard } from '../auth/admin.guard';
import { AdminPermissionGuard } from '../auth/admin-permission.guard';
import { ADMIN_PERMISSIONS } from '../auth/admin-permissions';
import type { AuthUser } from '../auth/auth.types';
import { RequireAdminPermission } from '../auth/require-admin-permission.decorator';
import { ApprovalService } from './approval.service';
import { ApprovalQueryDto } from './dto/approval-query.dto';
import { ReviewApprovalDto } from './dto/review-approval.dto';

interface AuthenticatedRequest {
  user: AuthUser;
  ip?: string;
  headers: Record<string, string | string[] | undefined>;
}

@UseGuards(AdminGuard, AdminPermissionGuard)
@RequireAdminPermission(ADMIN_PERMISSIONS.approvalsReview)
@Controller('approvals')
export class ApprovalController {
  constructor(private readonly approvalService: ApprovalService) {}

  @Get()
  listApprovals(@Query() query: ApprovalQueryDto) {
    return this.approvalService.listApprovals(query);
  }

  @Patch(':id')
  reviewApproval(
    @Param('id') id: string,
    @Body() input: ReviewApprovalDto,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.approvalService.reviewApproval(
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
