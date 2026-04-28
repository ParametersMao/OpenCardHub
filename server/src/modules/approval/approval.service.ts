import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma, type ApprovalRequest } from '@prisma/client';
import type { AuthUser } from '../auth/auth.types';
import { PrismaService } from '../database/prisma.service';
import type { ApprovalQueryDto } from './dto/approval-query.dto';
import type { ReviewApprovalDto } from './dto/review-approval.dto';

interface AuditContext {
  operator?: AuthUser;
  ip?: string;
  userAgent?: string;
}

interface CreateApprovalRequestInput {
  type: string;
  action: string;
  targetType?: string;
  targetId?: bigint;
  payload: Record<string, unknown>;
  remark?: string;
}

interface AdminPermissionUpdatePayload {
  userId: string;
  permission: string;
  enabled: boolean;
  remark?: string;
}

interface WithdrawalReviewPayload {
  withdrawalId: string;
  status: 'paid';
  reviewRemark?: string;
}

interface SettlementReviewPayload {
  settlementId: string;
  status: 'confirmed' | 'voided';
  remark?: string;
}

@Injectable()
export class ApprovalService {
  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  isAdminPermissionApprovalRequired() {
    return this.configService.get<string>('APPROVAL_ADMIN_PERMISSION_REQUIRED', 'false') === 'true';
  }

  isWithdrawalPaidApprovalRequired() {
    return this.configService.get<string>('APPROVAL_WITHDRAWAL_PAID_REQUIRED', 'false') === 'true';
  }

  isSettlementReviewApprovalRequired() {
    return this.configService.get<string>('APPROVAL_SETTLEMENT_REVIEW_REQUIRED', 'false') === 'true';
  }

  async listApprovals(query: ApprovalQueryDto = {}) {
    const approvals = await this.prisma.approvalRequest.findMany({
      where: {
        status: query.status,
        type: query.type,
      },
      orderBy: {
        id: 'desc',
      },
      take: 100,
    });

    return approvals.map((approval) => this.mapApproval(approval));
  }

  async createApprovalRequest(input: CreateApprovalRequestInput, audit?: AuditContext) {
    const approval = await this.prisma.$transaction(async (tx) => {
      const createdApproval = await tx.approvalRequest.create({
        data: {
          requestNo: this.createRequestNo(),
          type: input.type,
          action: input.action,
          requesterId: audit?.operator ? BigInt(audit.operator.id) : undefined,
          targetType: input.targetType,
          targetId: input.targetId,
          payloadJson: input.payload as Prisma.InputJsonValue,
          remark: input.remark,
        },
      });

      await tx.operationLog.create({
        data: {
          userId: audit?.operator ? BigInt(audit.operator.id) : undefined,
          action: 'approval.create',
          targetType: 'approval_request',
          targetId: createdApproval.id,
          ip: audit?.ip,
          detailJson: {
            type: input.type,
            action: input.action,
            targetType: input.targetType,
            targetId: input.targetId?.toString(),
            operator: audit?.operator?.username,
            userAgent: audit?.userAgent,
          } as Prisma.InputJsonValue,
        },
      });

      return createdApproval;
    });

    return this.mapApproval(approval);
  }

  async reviewApproval(id: string, input: ReviewApprovalDto, audit?: AuditContext) {
    const approvalId = BigInt(id);

    const approval = await this.prisma.$transaction(async (tx) => {
      const existingApproval = await tx.approvalRequest.findUnique({
        where: {
          id: approvalId,
        },
      });

      if (!existingApproval) {
        throw new NotFoundException('Approval request not found.');
      }

      if (existingApproval.status !== 'pending') {
        throw new BadRequestException('Only pending approval requests can be reviewed.');
      }

      if (
        audit?.operator &&
        existingApproval.requesterId?.toString() === audit.operator.id
      ) {
        throw new BadRequestException('Cannot review your own approval request.');
      }

      let result: Record<string, unknown> | undefined;
      let appliedAt: Date | undefined;
      if (input.status === 'approved') {
        result = await this.applyApproval(tx, existingApproval);
        appliedAt = new Date();
      }

      const updatedApproval = await tx.approvalRequest.update({
        where: {
          id: approvalId,
        },
        data: {
          status: input.status,
          reviewerId: audit?.operator ? BigInt(audit.operator.id) : undefined,
          reviewRemark: input.reviewRemark,
          reviewedAt: new Date(),
          appliedAt,
          resultJson: result as Prisma.InputJsonValue | undefined,
        },
      });

      await tx.operationLog.create({
        data: {
          userId: audit?.operator ? BigInt(audit.operator.id) : undefined,
          action: 'approval.review',
          targetType: 'approval_request',
          targetId: updatedApproval.id,
          ip: audit?.ip,
          detailJson: {
            status: input.status,
            type: updatedApproval.type,
            action: updatedApproval.action,
            reviewRemark: input.reviewRemark,
            result,
            operator: audit?.operator?.username,
            userAgent: audit?.userAgent,
          } as Prisma.InputJsonValue,
        },
      });

      return updatedApproval;
    });

    return this.mapApproval(approval);
  }

  private async applyApproval(
    tx: Prisma.TransactionClient,
    approval: ApprovalRequest,
  ): Promise<Record<string, unknown>> {
    if (approval.type === 'admin_permission_update') {
      return this.applyAdminPermissionUpdate(tx, approval.payloadJson);
    }

    if (approval.type === 'withdrawal_paid') {
      return this.applyWithdrawalPaid(tx, approval.payloadJson);
    }

    if (approval.type === 'settlement_review') {
      return this.applySettlementReview(tx, approval.payloadJson);
    }

    throw new BadRequestException('Unsupported approval request type.');
  }

  private async applyAdminPermissionUpdate(
    tx: Prisma.TransactionClient,
    payload: Prisma.JsonValue,
  ) {
    const input = payload as unknown as AdminPermissionUpdatePayload;
    const userId = BigInt(input.userId);

    const updatedPermission = await tx.userCapability.upsert({
      where: {
        userId_capabilityKey: {
          userId,
          capabilityKey: input.permission,
        },
      },
      create: {
        userId,
        capabilityKey: input.permission,
        enabled: input.enabled,
        configJson: this.toOptionalPrismaJson({ remark: input.remark }),
      },
      update: {
        enabled: input.enabled,
        configJson: this.toOptionalPrismaJson({ remark: input.remark }),
      },
    });

    return {
      userId: input.userId,
      permission: updatedPermission.capabilityKey,
      enabled: updatedPermission.enabled,
    };
  }

  private async applyWithdrawalPaid(
    tx: Prisma.TransactionClient,
    payload: Prisma.JsonValue,
  ) {
    const input = payload as unknown as WithdrawalReviewPayload;
    const withdrawal = await tx.withdrawal.findUnique({
      where: {
        id: BigInt(input.withdrawalId),
      },
    });

    if (!withdrawal) {
      throw new BadRequestException('Withdrawal not found.');
    }

    if (withdrawal.status !== 'approved') {
      throw new BadRequestException('Only approved withdrawals can be marked as paid.');
    }

    const account = await tx.user.findUniqueOrThrow({
      where: {
        id: withdrawal.userId,
      },
      select: {
        balance: true,
      },
    });

    await tx.financeTransaction.create({
      data: {
        userId: withdrawal.userId,
        type: 'withdrawal_paid',
        amount: new Prisma.Decimal(0),
        balanceAfter: account.balance,
        referenceNo: `WITHDRAWAL_PAID:${withdrawal.id.toString()}`,
        remark: input.reviewRemark ?? 'Withdrawal paid.',
      },
    });

    const updatedWithdrawal = await tx.withdrawal.update({
      where: {
        id: withdrawal.id,
      },
      data: {
        status: input.status,
        reviewRemark: input.reviewRemark,
        reviewedAt: new Date(),
        paidAt: new Date(),
      },
    });

    return {
      withdrawalId: updatedWithdrawal.id.toString(),
      status: updatedWithdrawal.status,
    };
  }

  private async applySettlementReview(
    tx: Prisma.TransactionClient,
    payload: Prisma.JsonValue,
  ) {
    const input = payload as unknown as SettlementReviewPayload;
    const settlement = await tx.settlement.findUnique({
      where: {
        id: BigInt(input.settlementId),
      },
    });

    if (!settlement) {
      throw new BadRequestException('Settlement not found.');
    }

    const allowedTransitions: Record<string, Array<SettlementReviewPayload['status']>> = {
      draft: ['confirmed', 'voided'],
      confirmed: ['voided'],
      archived: [],
      voided: [],
    };

    if (!allowedTransitions[settlement.status]?.includes(input.status)) {
      throw new BadRequestException(
        `Cannot change settlement status from ${settlement.status} to ${input.status}.`,
      );
    }

    const updatedSettlement = await tx.settlement.update({
      where: {
        id: settlement.id,
      },
      data: {
        status: input.status,
        remark: input.remark ?? settlement.remark,
        confirmedAt: input.status === 'confirmed' ? new Date() : undefined,
        voidedAt: input.status === 'voided' ? new Date() : undefined,
      },
    });

    return {
      settlementId: updatedSettlement.id.toString(),
      settlementNo: updatedSettlement.settlementNo,
      status: updatedSettlement.status,
    };
  }

  private createRequestNo() {
    return `APR${Date.now()}${Math.floor(Math.random() * 10000)
      .toString()
      .padStart(4, '0')}`;
  }

  private toOptionalPrismaJson(
    value: Record<string, unknown | undefined>,
  ): Prisma.InputJsonValue | undefined {
    const entries = Object.entries(value).filter(([, item]) => item !== undefined);

    if (entries.length === 0) {
      return undefined;
    }

    return Object.fromEntries(entries) as Prisma.InputJsonValue;
  }

  private mapApproval(approval: ApprovalRequest) {
    return {
      id: approval.id.toString(),
      requestNo: approval.requestNo,
      type: approval.type,
      status: approval.status,
      requesterId: approval.requesterId?.toString(),
      reviewerId: approval.reviewerId?.toString(),
      targetType: approval.targetType,
      targetId: approval.targetId?.toString(),
      action: approval.action,
      payload: approval.payloadJson,
      result: approval.resultJson,
      remark: approval.remark,
      reviewRemark: approval.reviewRemark,
      createdAt: approval.createdAt,
      reviewedAt: approval.reviewedAt,
      appliedAt: approval.appliedAt,
    };
  }
}
