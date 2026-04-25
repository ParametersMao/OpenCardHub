import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import type { AuthUser } from '../auth/auth.types';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { OrderService } from './order.service';

interface AuthenticatedRequest {
  user: AuthUser;
}

@UseGuards(JwtAuthGuard)
@Controller('agent/orders')
export class AgentOrderController {
  constructor(private readonly orderService: OrderService) {}

  @Get()
  listMyOrders(@Req() request: AuthenticatedRequest) {
    return this.orderService.listAgentOrders(request.user);
  }

  @Get('summary')
  getMyOrderSummary(@Req() request: AuthenticatedRequest) {
    return this.orderService.getAgentOrderSummary(request.user);
  }
}
