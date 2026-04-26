import { BadRequestException, Injectable } from '@nestjs/common';
import { Prisma, type FinanceTransaction, type Withdrawal } from '@prisma/client';
import type { AuthUser } from '../auth/auth.types';
import { PrismaService } from '../database/prisma.service';
import type { CreateWithdrawalDto } from './dto/create-withdrawal.dto';
import type { ReviewWithdrawalDto } from './dto/review-withdrawal.dto';

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

  async createWithdrawal(user: AuthUser, input: CreateWithdrawalDto) {
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

  async reviewWithdrawal(id: string, input: ReviewWithdrawalDto) {
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

      return tx.withdrawal.update({
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
    });

    return this.mapWithdrawal(withdrawal);
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
}
