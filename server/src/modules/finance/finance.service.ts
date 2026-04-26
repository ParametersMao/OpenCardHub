import { BadRequestException, Injectable } from '@nestjs/common';
import {
  Prisma,
  type FinanceTransaction,
  type OperationLog,
  type Settlement,
  type Withdrawal,
} from '@prisma/client';
import type { AuthUser } from '../auth/auth.types';
import { PrismaService } from '../database/prisma.service';
import type { AuditLogQueryDto } from './dto/audit-log-query.dto';
import type { CreateSettlementDto } from './dto/create-settlement.dto';
import type { CreateWithdrawalDto } from './dto/create-withdrawal.dto';
import type { ReportQueryDto } from './dto/report-query.dto';
import type { ReviewSettlementDto } from './dto/review-settlement.dto';
import type { SettlementDetailsQueryDto } from './dto/settlement-details-query.dto';
import type { ReviewWithdrawalDto } from './dto/review-withdrawal.dto';

interface AuditContext {
  operator?: AuthUser;
  ip?: string;
  userAgent?: string;
}

@Injectable()
export class FinanceService {
  constructor(private readonly prisma: PrismaService) {}

  async creditOrderProfit(input: {
    userId: bigint;
    orderNo: string;
    amount: Prisma.Decimal;
    metadata?: Record<string, unknown>;
  }) {
    if (input.amount.lte(0)) {
      return;
    }

    const referenceNo = `ORDER_PROFIT:${input.orderNo}`;
    await this.prisma.$transaction(async (tx) => {
      const existed = await tx.financeTransaction.findUnique({
        where: {
          referenceNo,
        },
      });

      if (existed) {
        return;
      }

      const user = await tx.user.update({
        where: {
          id: input.userId,
        },
        data: {
          balance: {
            increment: input.amount,
          },
        },
      });

      await tx.financeTransaction.create({
        data: {
          userId: input.userId,
          type: 'order_profit',
          amount: input.amount,
          balanceAfter: user.balance,
          referenceNo,
          remark: 'Order profit credited.',
          metadataJson: input.metadata as Prisma.InputJsonValue,
        },
      });
    });
  }

  async getAgentSummary(user: AuthUser) {
    this.assertAgentUser(user);

    const [account, pendingWithdrawals, profit] = await Promise.all([
      this.prisma.user.findUniqueOrThrow({
        where: {
          id: BigInt(user.id),
        },
      }),
      this.prisma.withdrawal.aggregate({
        where: {
          userId: BigInt(user.id),
          status: {
            in: ['pending', 'approved'],
          },
        },
        _sum: {
          amount: true,
        },
      }),
      this.prisma.financeTransaction.aggregate({
        where: {
          userId: BigInt(user.id),
          type: 'order_profit',
        },
        _sum: {
          amount: true,
        },
      }),
    ]);

    return {
      balance: account.balance.toNumber(),
      pendingWithdrawalAmount: this.decimalToNumber(pendingWithdrawals._sum.amount),
      totalProfit: this.decimalToNumber(profit._sum.amount),
    };
  }

  async listAgentTransactions(user: AuthUser) {
    this.assertAgentUser(user);
    const transactions = await this.prisma.financeTransaction.findMany({
      where: {
        userId: BigInt(user.id),
      },
      orderBy: {
        id: 'desc',
      },
    });

    return transactions.map((transaction) => this.mapTransaction(transaction));
  }

  async listAgentWithdrawals(user: AuthUser) {
    this.assertAgentUser(user);
    const withdrawals = await this.prisma.withdrawal.findMany({
      where: {
        userId: BigInt(user.id),
      },
      orderBy: {
        id: 'desc',
      },
    });

    return withdrawals.map((withdrawal) => this.mapWithdrawal(withdrawal));
  }

  async createWithdrawal(
    user: AuthUser,
    input: CreateWithdrawalDto,
    audit?: AuditContext,
  ) {
    this.assertAgentUser(user);
    const amount = new Prisma.Decimal(input.amount);

    const withdrawal = await this.prisma.$transaction(async (tx) => {
      const account = await tx.user.findUniqueOrThrow({
        where: {
          id: BigInt(user.id),
        },
      });

      if (account.balance.lt(amount)) {
        throw new BadRequestException('Insufficient balance for withdrawal.');
      }

      const updatedUser = await tx.user.update({
        where: {
          id: account.id,
        },
        data: {
          balance: {
            decrement: amount,
          },
        },
      });

      const createdWithdrawal = await tx.withdrawal.create({
        data: {
          userId: account.id,
          amount,
          accountType: input.accountType,
          accountName: input.accountName,
          accountNo: input.accountNo,
          remark: input.remark,
        },
      });

      await tx.financeTransaction.create({
        data: {
          userId: account.id,
          type: 'withdrawal_freeze',
          amount: amount.negated(),
          balanceAfter: updatedUser.balance,
          referenceNo: `WITHDRAWAL_FREEZE:${createdWithdrawal.id.toString()}`,
          remark: 'Withdrawal balance frozen.',
        },
      });

      await this.createOperationLog(tx, {
        userId: account.id,
        action: 'finance.withdrawal.create',
        targetType: 'withdrawal',
        targetId: createdWithdrawal.id,
        ip: audit?.ip,
        detail: {
          operatorUsername: audit?.operator?.username ?? user.username,
          userAgent: audit?.userAgent,
          amount: amount.toNumber(),
          accountType: input.accountType,
        },
      });

      return createdWithdrawal;
    });

    return this.mapWithdrawal(withdrawal);
  }

  async listWithdrawals() {
    const withdrawals = await this.prisma.withdrawal.findMany({
      orderBy: {
        id: 'desc',
      },
      include: {
        user: true,
      },
    });

    return withdrawals.map((withdrawal) => ({
      ...this.mapWithdrawal(withdrawal),
      username: withdrawal.user.username,
    }));
  }

  async getAdminSummary() {
    const [pending, approved, paid, rejected] = await Promise.all([
      this.aggregateWithdrawalsByStatus('pending'),
      this.aggregateWithdrawalsByStatus('approved'),
      this.aggregateWithdrawalsByStatus('paid'),
      this.aggregateWithdrawalsByStatus('rejected'),
    ]);

    return {
      pendingCount: pending._count._all,
      pendingAmount: this.decimalToNumber(pending._sum.amount),
      approvedCount: approved._count._all,
      approvedAmount: this.decimalToNumber(approved._sum.amount),
      paidCount: paid._count._all,
      paidAmount: this.decimalToNumber(paid._sum.amount),
      rejectedCount: rejected._count._all,
      rejectedAmount: this.decimalToNumber(rejected._sum.amount),
    };
  }

  async getAdminReportSummary(query: ReportQueryDto) {
    const range = this.resolveDateRange(query);
    const orderWhere: Prisma.OrderWhereInput = {
      paymentStatus: 'paid',
      paidAt: range,
    };
    const withdrawalWhere: Prisma.WithdrawalWhereInput = {
      createdAt: range,
    };

    const [
      paidOrders,
      agentOrders,
      directOrders,
      pendingWithdrawals,
      approvedWithdrawals,
      paidWithdrawals,
      rejectedWithdrawals,
    ] = await Promise.all([
      this.prisma.order.aggregate({
        where: orderWhere,
        _count: {
          _all: true,
        },
        _sum: {
          totalAmount: true,
          costAmount: true,
          agentProfit: true,
          platformProfit: true,
        },
      }),
      this.prisma.order.aggregate({
        where: {
          ...orderWhere,
          agentUserId: {
            not: null,
          },
        },
        _count: {
          _all: true,
        },
        _sum: {
          totalAmount: true,
          agentProfit: true,
          platformProfit: true,
        },
      }),
      this.prisma.order.aggregate({
        where: {
          ...orderWhere,
          agentUserId: null,
        },
        _count: {
          _all: true,
        },
        _sum: {
          totalAmount: true,
          platformProfit: true,
        },
      }),
      this.aggregateWithdrawals('pending', withdrawalWhere),
      this.aggregateWithdrawals('approved', withdrawalWhere),
      this.aggregateWithdrawals('paid', withdrawalWhere),
      this.aggregateWithdrawals('rejected', withdrawalWhere),
    ]);

    return {
      range: this.mapDateRange(range),
      orders: {
        paidCount: paidOrders._count._all,
        paidAmount: this.decimalToNumber(paidOrders._sum.totalAmount),
        costAmount: this.decimalToNumber(paidOrders._sum.costAmount),
        agentProfit: this.decimalToNumber(paidOrders._sum.agentProfit),
        platformProfit: this.decimalToNumber(paidOrders._sum.platformProfit),
        directCount: directOrders._count._all,
        directAmount: this.decimalToNumber(directOrders._sum.totalAmount),
        agentCount: agentOrders._count._all,
        agentAmount: this.decimalToNumber(agentOrders._sum.totalAmount),
      },
      withdrawals: {
        pendingCount: pendingWithdrawals._count._all,
        pendingAmount: this.decimalToNumber(pendingWithdrawals._sum.amount),
        approvedCount: approvedWithdrawals._count._all,
        approvedAmount: this.decimalToNumber(approvedWithdrawals._sum.amount),
        paidCount: paidWithdrawals._count._all,
        paidAmount: this.decimalToNumber(paidWithdrawals._sum.amount),
        rejectedCount: rejectedWithdrawals._count._all,
        rejectedAmount: this.decimalToNumber(rejectedWithdrawals._sum.amount),
      },
    };
  }

  async getAgentReportSummary(user: AuthUser, query: ReportQueryDto) {
    this.assertAgentUser(user);
    const userId = BigInt(user.id);
    const range = this.resolveDateRange(query);

    const [orders, withdrawals, transactions] = await Promise.all([
      this.prisma.order.aggregate({
        where: {
          agentUserId: userId,
          paymentStatus: 'paid',
          paidAt: range,
        },
        _count: {
          _all: true,
        },
        _sum: {
          totalAmount: true,
          agentProfit: true,
          platformProfit: true,
        },
      }),
      this.prisma.withdrawal.aggregate({
        where: {
          userId,
          status: 'paid',
          paidAt: range,
        },
        _count: {
          _all: true,
        },
        _sum: {
          amount: true,
        },
      }),
      this.prisma.financeTransaction.aggregate({
        where: {
          userId,
          type: 'order_profit',
          createdAt: range,
        },
        _count: {
          id: true,
        },
        _sum: {
          amount: true,
        },
      }),
    ]);

    return {
      range: this.mapDateRange(range),
      orders: {
        paidCount: orders._count._all,
        paidAmount: this.decimalToNumber(orders._sum.totalAmount),
        agentProfit: this.decimalToNumber(orders._sum.agentProfit),
        platformProfit: this.decimalToNumber(orders._sum.platformProfit),
      },
      profit: {
        creditedCount: transactions._count.id,
        creditedAmount: this.decimalToNumber(transactions._sum.amount),
      },
      withdrawals: {
        paidCount: withdrawals._count._all,
        paidAmount: this.decimalToNumber(withdrawals._sum.amount),
      },
    };
  }

  async listSettlements() {
    const settlements = await this.prisma.settlement.findMany({
      orderBy: {
        id: 'desc',
      },
      include: {
        user: true,
      },
    });

    return settlements.map((settlement) => this.mapSettlement(settlement));
  }

  async listAuditLogs(query: AuditLogQueryDto) {
    const pagination = this.resolvePagination(query.page, query.pageSize, 20);
    const where: Prisma.OperationLogWhereInput = {
      action: query.action
        ? {
            contains: query.action,
          }
        : {
            startsWith: 'finance.',
          },
      targetType: query.targetType || undefined,
      targetId: query.targetId ? BigInt(query.targetId) : undefined,
    };
    const [total, logs] = await Promise.all([
      this.prisma.operationLog.count({
        where,
      }),
      this.prisma.operationLog.findMany({
        where,
        orderBy: {
          id: 'desc',
        },
        skip: pagination.skip,
        take: pagination.pageSize,
      }),
    ]);

    return this.mapPaginatedResult(
      logs.map((log) => this.mapOperationLog(log)),
      total,
      pagination,
    );
  }

  async listAgentSettlements(user: AuthUser) {
    this.assertAgentUser(user);
    const settlements = await this.prisma.settlement.findMany({
      where: {
        userId: BigInt(user.id),
      },
      orderBy: {
        id: 'desc',
      },
      include: {
        user: true,
      },
    });

    return settlements.map((settlement) => this.mapSettlement(settlement));
  }

  async getSettlementDetails(id: string, query: SettlementDetailsQueryDto) {
    const settlement = await this.prisma.settlement.findUnique({
      where: {
        id: BigInt(id),
      },
      include: {
        user: true,
      },
    });

    if (!settlement) {
      throw new BadRequestException('Settlement not found.');
    }

    return this.buildSettlementDetails(settlement, query);
  }

  async getAgentSettlementDetails(
    user: AuthUser,
    id: string,
    query: SettlementDetailsQueryDto,
  ) {
    this.assertAgentUser(user);
    const settlement = await this.prisma.settlement.findFirst({
      where: {
        id: BigInt(id),
        userId: BigInt(user.id),
      },
      include: {
        user: true,
      },
    });

    if (!settlement) {
      throw new BadRequestException('Settlement not found.');
    }

    return this.buildSettlementDetails(settlement, query);
  }

  async createSettlement(input: CreateSettlementDto, audit?: AuditContext) {
    const period = this.resolveRequiredPeriod(input.startDate, input.endDate);
    const userId = input.userId ? BigInt(input.userId) : undefined;
    const settlementScope = this.createSettlementScope(userId);

    const settlement = await this.prisma.$transaction(async (tx) => {
      if (userId) {
        const user = await tx.user.findUnique({
          where: {
            id: userId,
          },
        });

        if (!user || user.role !== 'agent') {
          throw new BadRequestException('Settlement user must be an agent.');
        }
      }

      const existing = await tx.settlement.findFirst({
        where: {
          settlementScope,
          periodStart: period.startDate,
          periodEnd: period.endDate,
          status: {
            in: ['draft', 'confirmed', 'archived'],
          },
        },
      });

      if (existing) {
        throw new BadRequestException(
          'An active settlement already exists for this scope and period.',
        );
      }

      const snapshot = await this.createSettlementSnapshot(tx, {
        userId,
        periodStart: period.startDate,
        periodEnd: period.endDate,
      });

      const createdSettlement = await tx.settlement.create({
        data: {
          settlementNo: this.createSettlementNo(),
          settlementScope,
          userId,
          periodStart: period.startDate,
          periodEnd: period.endDate,
          paidOrderCount: snapshot.orders.paidCount,
          paidAmount: new Prisma.Decimal(snapshot.orders.paidAmount),
          costAmount: new Prisma.Decimal(snapshot.orders.costAmount),
          agentProfit: new Prisma.Decimal(snapshot.orders.agentProfit),
          platformProfit: new Prisma.Decimal(snapshot.orders.platformProfit),
          withdrawalAmount: new Prisma.Decimal(snapshot.withdrawals.paidAmount),
          snapshotJson: snapshot as Prisma.InputJsonValue,
          remark: input.remark,
        },
        include: {
          user: true,
        },
      });

      await this.createOperationLog(tx, {
        userId: audit?.operator ? BigInt(audit.operator.id) : undefined,
        action: 'finance.settlement.create',
        targetType: 'settlement',
        targetId: createdSettlement.id,
        ip: audit?.ip,
        detail: {
          operatorUsername: audit?.operator?.username,
          userAgent: audit?.userAgent,
          settlementNo: createdSettlement.settlementNo,
          settlementScope: createdSettlement.settlementScope,
          periodStart: createdSettlement.periodStart.toISOString(),
          periodEnd: createdSettlement.periodEnd.toISOString(),
          paidAmount: createdSettlement.paidAmount.toNumber(),
          agentProfit: createdSettlement.agentProfit.toNumber(),
          platformProfit: createdSettlement.platformProfit.toNumber(),
          withdrawalAmount: createdSettlement.withdrawalAmount.toNumber(),
        },
      });

      return createdSettlement;
    });

    return this.mapSettlement(settlement);
  }

  async reviewSettlement(
    id: string,
    input: ReviewSettlementDto,
    audit?: AuditContext,
  ) {
    const settlement = await this.prisma.$transaction(async (tx) => {
      const current = await tx.settlement.findUnique({
        where: {
          id: BigInt(id),
        },
      });

      if (!current) {
        throw new BadRequestException('Settlement not found.');
      }

      if (current.status === input.status) {
        return current;
      }

      this.assertSettlementTransition(current.status, input.status);

      const updatedSettlement = await tx.settlement.update({
        where: {
          id: current.id,
        },
        data: {
          status: input.status,
          remark: input.remark ?? current.remark,
          confirmedAt: input.status === 'confirmed' ? new Date() : undefined,
          voidedAt: input.status === 'voided' ? new Date() : undefined,
        },
        include: {
          user: true,
        },
      });

      await this.createOperationLog(tx, {
        userId: audit?.operator ? BigInt(audit.operator.id) : undefined,
        action: 'finance.settlement.review',
        targetType: 'settlement',
        targetId: updatedSettlement.id,
        ip: audit?.ip,
        detail: {
          operatorUsername: audit?.operator?.username,
          userAgent: audit?.userAgent,
          settlementNo: updatedSettlement.settlementNo,
          fromStatus: current.status,
          toStatus: updatedSettlement.status,
          remark: input.remark,
        },
      });

      return updatedSettlement;
    });

    return this.mapSettlement(settlement);
  }

  async reviewWithdrawal(
    id: string,
    input: ReviewWithdrawalDto,
    audit?: AuditContext,
  ) {
    const withdrawal = await this.prisma.$transaction(async (tx) => {
      const current = await tx.withdrawal.findUnique({
        where: {
          id: BigInt(id),
        },
      });

      if (!current) {
        throw new BadRequestException('Withdrawal not found.');
      }

      if (current.status === 'paid' || current.status === 'rejected') {
        throw new BadRequestException('Withdrawal is already finished.');
      }

      if (current.status === input.status) {
        return current;
      }

      this.assertWithdrawalTransition(current.status, input.status);

      if (input.status === 'rejected') {
        const user = await tx.user.update({
          where: {
            id: current.userId,
          },
          data: {
            balance: {
              increment: current.amount,
            },
          },
        });

        await tx.financeTransaction.create({
          data: {
            userId: current.userId,
            type: 'withdrawal_reject',
            amount: current.amount,
            balanceAfter: user.balance,
            referenceNo: `WITHDRAWAL_REJECT:${current.id.toString()}`,
            remark: input.reviewRemark ?? 'Withdrawal rejected.',
          },
        });
      }

      if (input.status === 'paid') {
        await tx.financeTransaction.create({
          data: {
            userId: current.userId,
            type: 'withdrawal_paid',
            amount: new Prisma.Decimal(0),
            balanceAfter: await this.getUserBalance(tx, current.userId),
            referenceNo: `WITHDRAWAL_PAID:${current.id.toString()}`,
            remark: input.reviewRemark ?? 'Withdrawal paid.',
          },
        });
      }

      const updatedWithdrawal = await tx.withdrawal.update({
        where: {
          id: current.id,
        },
        data: {
          status: input.status,
          reviewRemark: input.reviewRemark,
          reviewedAt: new Date(),
          paidAt: input.status === 'paid' ? new Date() : undefined,
        },
      });

      await this.createOperationLog(tx, {
        userId: audit?.operator ? BigInt(audit.operator.id) : undefined,
        action: 'finance.withdrawal.review',
        targetType: 'withdrawal',
        targetId: updatedWithdrawal.id,
        ip: audit?.ip,
        detail: {
          operatorUsername: audit?.operator?.username,
          userAgent: audit?.userAgent,
          userId: current.userId.toString(),
          amount: current.amount.toNumber(),
          fromStatus: current.status,
          toStatus: updatedWithdrawal.status,
          reviewRemark: input.reviewRemark,
        },
      });

      return updatedWithdrawal;
    });

    return this.mapWithdrawal(withdrawal);
  }

  async exportSettlementsCsv() {
    const settlements = await this.prisma.settlement.findMany({
      orderBy: {
        id: 'desc',
      },
      include: {
        user: true,
      },
    });
    const headers = [
      'settlement_no',
      'scope',
      'username',
      'status',
      'period_start',
      'period_end',
      'paid_order_count',
      'paid_amount',
      'cost_amount',
      'agent_profit',
      'platform_profit',
      'withdrawal_amount',
      'remark',
      'created_at',
    ];
    const rows = settlements.map((settlement) => [
      settlement.settlementNo,
      settlement.settlementScope,
      settlement.user?.username ?? '',
      settlement.status,
      settlement.periodStart.toISOString(),
      settlement.periodEnd.toISOString(),
      settlement.paidOrderCount.toString(),
      settlement.paidAmount.toFixed(2),
      settlement.costAmount.toFixed(2),
      settlement.agentProfit.toFixed(2),
      settlement.platformProfit.toFixed(2),
      settlement.withdrawalAmount.toFixed(2),
      settlement.remark ?? '',
      settlement.createdAt.toISOString(),
    ]);

    return [headers, ...rows]
      .map((row) => row.map((cell) => this.escapeCsvCell(cell)).join(','))
      .join('\n');
  }

  private aggregateWithdrawalsByStatus(status: Withdrawal['status']) {
    return this.prisma.withdrawal.aggregate({
      where: {
        status,
      },
      _count: {
        _all: true,
      },
      _sum: {
        amount: true,
      },
    });
  }

  private aggregateWithdrawals(
    status: Withdrawal['status'],
    where: Prisma.WithdrawalWhereInput,
  ) {
    return this.prisma.withdrawal.aggregate({
      where: {
        ...where,
        status,
      },
      _count: {
        _all: true,
      },
      _sum: {
        amount: true,
      },
    });
  }

  private resolveDateRange(query: ReportQueryDto) {
    const range: { gte?: Date; lte?: Date } = {};

    if (query.startDate) {
      range.gte = new Date(query.startDate);
    }

    if (query.endDate) {
      range.lte = new Date(query.endDate);
    }

    return range;
  }

  private mapDateRange(range: { gte?: Date; lte?: Date }) {
    return {
      startDate: range.gte instanceof Date ? range.gte.toISOString() : undefined,
      endDate: range.lte instanceof Date ? range.lte.toISOString() : undefined,
    };
  }

  private resolveRequiredPeriod(startDate: string, endDate: string) {
    const start = new Date(startDate);
    const end = new Date(endDate);

    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
      throw new BadRequestException('Invalid settlement period.');
    }

    if (start > end) {
      throw new BadRequestException('Settlement start date must be before end date.');
    }

    return {
      startDate: start,
      endDate: end,
    };
  }

  private async createSettlementSnapshot(
    tx: Prisma.TransactionClient,
    input: {
      userId?: bigint;
      periodStart: Date;
      periodEnd: Date;
    },
  ) {
    const paidAt = {
      gte: input.periodStart,
      lte: input.periodEnd,
    };
    const orderWhere: Prisma.OrderWhereInput = {
      paymentStatus: 'paid',
      paidAt,
      ...(input.userId ? { agentUserId: input.userId } : {}),
    };
    const withdrawalWhere: Prisma.WithdrawalWhereInput = {
      status: 'paid',
      paidAt,
      ...(input.userId ? { userId: input.userId } : {}),
    };

    const [orders, withdrawals] = await Promise.all([
      tx.order.aggregate({
        where: orderWhere,
        _count: {
          _all: true,
        },
        _sum: {
          totalAmount: true,
          costAmount: true,
          agentProfit: true,
          platformProfit: true,
        },
      }),
      tx.withdrawal.aggregate({
        where: withdrawalWhere,
        _count: {
          _all: true,
        },
        _sum: {
          amount: true,
        },
      }),
    ]);

    return {
      generatedAt: new Date().toISOString(),
      scope: this.createSettlementScope(input.userId),
      period: {
        startDate: input.periodStart.toISOString(),
        endDate: input.periodEnd.toISOString(),
      },
      orders: {
        paidCount: orders._count._all,
        paidAmount: this.decimalToNumber(orders._sum.totalAmount),
        costAmount: this.decimalToNumber(orders._sum.costAmount),
        agentProfit: this.decimalToNumber(orders._sum.agentProfit),
        platformProfit: this.decimalToNumber(orders._sum.platformProfit),
      },
      withdrawals: {
        paidCount: withdrawals._count._all,
        paidAmount: this.decimalToNumber(withdrawals._sum.amount),
      },
    };
  }

  private async buildSettlementDetails(
    settlement: Settlement & { user?: { username: string } | null },
    query: SettlementDetailsQueryDto,
  ) {
    const orderPagination = this.resolvePagination(
      query.orderPage,
      query.orderPageSize,
      20,
    );
    const withdrawalPagination = this.resolvePagination(
      query.withdrawalPage,
      query.withdrawalPageSize,
      20,
    );
    const paidAt = {
      gte: settlement.periodStart,
      lte: settlement.periodEnd,
    };
    const userWhere = settlement.userId ? { agentUserId: settlement.userId } : {};
    const withdrawalUserWhere = settlement.userId
      ? { userId: settlement.userId }
      : {};
    const orderWhere: Prisma.OrderWhereInput = {
      paymentStatus: 'paid',
      paidAt,
      ...userWhere,
    };
    const withdrawalWhere: Prisma.WithdrawalWhereInput = {
      status: 'paid',
      paidAt,
      ...withdrawalUserWhere,
    };
    const [orderTotal, withdrawalTotal, orders, withdrawals] = await Promise.all([
      this.prisma.order.count({
        where: orderWhere,
      }),
      this.prisma.withdrawal.count({
        where: withdrawalWhere,
      }),
      this.prisma.order.findMany({
        where: orderWhere,
        orderBy: {
          paidAt: 'asc',
        },
        skip: orderPagination.skip,
        take: orderPagination.pageSize,
        include: {
          product: true,
          site: true,
          agent: true,
        },
      }),
      this.prisma.withdrawal.findMany({
        where: withdrawalWhere,
        orderBy: {
          paidAt: 'asc',
        },
        skip: withdrawalPagination.skip,
        take: withdrawalPagination.pageSize,
        include: {
          user: true,
        },
      }),
    ]);

    return {
      settlement: this.mapSettlement(settlement),
      orders: this.mapPaginatedResult(
        orders.map((order) => ({
          id: order.id.toString(),
          orderNo: order.orderNo,
          agentUserId: order.agentUserId?.toString(),
          agentUsername: order.agent?.username,
          siteName: order.site?.name,
          productName: order.product.name,
          quantity: order.quantity,
          totalAmount: order.totalAmount.toNumber(),
          costAmount: order.costAmount.toNumber(),
          agentProfit: order.agentProfit.toNumber(),
          platformProfit: order.platformProfit.toNumber(),
          paymentMethod: order.paymentMethod,
          paidAt: order.paidAt,
          createdAt: order.createdAt,
        })),
        orderTotal,
        orderPagination,
      ),
      withdrawals: this.mapPaginatedResult(
        withdrawals.map((withdrawal) => ({
          id: withdrawal.id.toString(),
          userId: withdrawal.userId.toString(),
          username: withdrawal.user.username,
          amount: withdrawal.amount.toNumber(),
          accountType: withdrawal.accountType,
          accountName: withdrawal.accountName,
          accountNo: withdrawal.accountNo,
          reviewRemark: withdrawal.reviewRemark,
          paidAt: withdrawal.paidAt,
          createdAt: withdrawal.createdAt,
        })),
        withdrawalTotal,
        withdrawalPagination,
      ),
    };
  }

  private resolvePagination(
    page: number | undefined,
    pageSize: number | undefined,
    defaultPageSize: number,
  ) {
    const safePage = Math.max(1, page ?? 1);
    const safePageSize = Math.min(100, Math.max(1, pageSize ?? defaultPageSize));

    return {
      page: safePage,
      pageSize: safePageSize,
      skip: (safePage - 1) * safePageSize,
    };
  }

  private mapPaginatedResult<T>(
    items: T[],
    total: number,
    pagination: { page: number; pageSize: number },
  ) {
    return {
      items,
      meta: {
        page: pagination.page,
        pageSize: pagination.pageSize,
        total,
        totalPages: Math.max(1, Math.ceil(total / pagination.pageSize)),
      },
    };
  }

  private createSettlementScope(userId?: bigint) {
    return userId ? `agent:${userId.toString()}` : 'platform';
  }

  private createSettlementNo() {
    const random = Math.floor(Math.random() * 1000000)
      .toString()
      .padStart(6, '0');
    return `ST${Date.now()}${random}`;
  }

  private assertSettlementTransition(
    current: Settlement['status'],
    next: ReviewSettlementDto['status'],
  ) {
    const allowedTransitions: Record<
      Settlement['status'],
      Array<ReviewSettlementDto['status']>
    > = {
      draft: ['confirmed', 'voided'],
      confirmed: ['archived', 'voided'],
      archived: [],
      voided: [],
    };

    if (!allowedTransitions[current].includes(next)) {
      throw new BadRequestException(
        `Cannot change settlement status from ${current} to ${next}.`,
      );
    }
  }

  private assertWithdrawalTransition(
    current: Withdrawal['status'],
    next: ReviewWithdrawalDto['status'],
  ) {
    const allowedTransitions: Record<
      Withdrawal['status'],
      Array<ReviewWithdrawalDto['status']>
    > = {
      pending: ['approved', 'rejected'],
      approved: ['paid', 'rejected'],
      rejected: [],
      paid: [],
      cancelled: [],
    };

    if (!allowedTransitions[current].includes(next)) {
      throw new BadRequestException(
        `Cannot change withdrawal status from ${current} to ${next}.`,
      );
    }
  }

  private async getUserBalance(tx: Prisma.TransactionClient, userId: bigint) {
    const user = await tx.user.findUniqueOrThrow({
      where: {
        id: userId,
      },
    });
    return user.balance;
  }

  private createOperationLog(
    tx: Prisma.TransactionClient,
    input: {
      userId?: bigint;
      action: string;
      targetType: string;
      targetId: bigint;
      ip?: string;
      detail: Record<string, unknown>;
    },
  ) {
    return tx.operationLog.create({
      data: {
        userId: input.userId,
        action: input.action,
        targetType: input.targetType,
        targetId: input.targetId,
        ip: input.ip,
        detailJson: input.detail as Prisma.InputJsonValue,
      },
    });
  }

  private escapeCsvCell(value: string) {
    const escaped = value.replaceAll('"', '""');
    return `"${escaped}"`;
  }

  private assertAgentUser(user: AuthUser) {
    if (user.role !== 'agent') {
      throw new BadRequestException('Only agent users can access finance.');
    }
  }

  private decimalToNumber(value: Prisma.Decimal | null | undefined) {
    return value?.toNumber() ?? 0;
  }

  private mapTransaction(transaction: FinanceTransaction) {
    return {
      id: transaction.id.toString(),
      userId: transaction.userId.toString(),
      type: transaction.type,
      amount: transaction.amount.toNumber(),
      balanceAfter: transaction.balanceAfter.toNumber(),
      referenceNo: transaction.referenceNo,
      remark: transaction.remark,
      metadata: transaction.metadataJson,
      createdAt: transaction.createdAt,
    };
  }

  private mapWithdrawal(withdrawal: Withdrawal) {
    return {
      id: withdrawal.id.toString(),
      userId: withdrawal.userId.toString(),
      amount: withdrawal.amount.toNumber(),
      status: withdrawal.status,
      accountType: withdrawal.accountType,
      accountName: withdrawal.accountName,
      accountNo: withdrawal.accountNo,
      remark: withdrawal.remark,
      reviewRemark: withdrawal.reviewRemark,
      reviewedAt: withdrawal.reviewedAt,
      paidAt: withdrawal.paidAt,
      createdAt: withdrawal.createdAt,
      updatedAt: withdrawal.updatedAt,
    };
  }

  private mapSettlement(settlement: Settlement & { user?: { username: string } | null }) {
    return {
      id: settlement.id.toString(),
      settlementNo: settlement.settlementNo,
      settlementScope: settlement.settlementScope,
      userId: settlement.userId?.toString(),
      username: settlement.user?.username,
      status: settlement.status,
      periodStart: settlement.periodStart,
      periodEnd: settlement.periodEnd,
      paidOrderCount: settlement.paidOrderCount,
      paidAmount: settlement.paidAmount.toNumber(),
      costAmount: settlement.costAmount.toNumber(),
      agentProfit: settlement.agentProfit.toNumber(),
      platformProfit: settlement.platformProfit.toNumber(),
      withdrawalAmount: settlement.withdrawalAmount.toNumber(),
      snapshot: settlement.snapshotJson,
      remark: settlement.remark,
      confirmedAt: settlement.confirmedAt,
      voidedAt: settlement.voidedAt,
      createdAt: settlement.createdAt,
      updatedAt: settlement.updatedAt,
    };
  }

  private mapOperationLog(log: OperationLog) {
    return {
      id: log.id.toString(),
      userId: log.userId?.toString(),
      action: log.action,
      targetType: log.targetType,
      targetId: log.targetId?.toString(),
      ip: log.ip,
      detail: log.detailJson,
      createdAt: log.createdAt,
    };
  }
}
