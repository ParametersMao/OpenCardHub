import { Body, Controller, Get, Param, Patch, UseGuards } from '@nestjs/common';
import { AdminGuard } from '../auth/admin.guard';
import { ReviewWithdrawalDto } from './dto/review-withdrawal.dto';
import { FinanceService } from './finance.service';

@UseGuards(AdminGuard)
@Controller('finance')
export class FinanceController {
  constructor(private readonly financeService: FinanceService) {}

  @Get('withdrawals')
  listWithdrawals() {
    return this.financeService.listWithdrawals();
  }

  @Patch('withdrawals/:id')
  reviewWithdrawal(
    @Param('id') id: string,
    @Body() input: ReviewWithdrawalDto,
  ) {
    return this.financeService.reviewWithdrawal(id, input);
  }
}
