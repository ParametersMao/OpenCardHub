import { Body, Controller, Param, Post } from '@nestjs/common';
import { PaymentService } from './payment.service';

@Controller('payments')
export class PaymentController {
  constructor(private readonly paymentService: PaymentService) {}

  @Post('alipay/orders/:orderId')
  createAlipayPayment(@Param('orderId') orderId: string) {
    return this.paymentService.createAlipayPayment(orderId);
  }

  @Post('alipay/callback')
  handleAlipayCallback(@Body() input: Record<string, unknown>) {
    return this.paymentService.handleAlipayCallback(input);
  }
}
