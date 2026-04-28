import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { AdminGuard } from './admin.guard';
import { AuthService } from './auth.service';
import type { AuthUser } from './auth.types';
import { LoginDto } from './dto/login.dto';
import { UserService } from '../user/user.service';

interface LoginRequest {
  ip?: string;
  headers: Record<string, string | string[] | undefined>;
}

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly userService: UserService,
  ) {}

  @Post('login')
  login(@Body() input: LoginDto, @Req() request: LoginRequest) {
    return this.authService.login(input, {
      ip: this.getHeaderValue(request, 'x-forwarded-for') ?? request.ip,
      userAgent: this.getHeaderValue(request, 'user-agent'),
    });
  }

  @UseGuards(AdminGuard)
  @Get('me')
  getMe(@Req() request: { user: AuthUser }) {
    return request.user;
  }

  @UseGuards(AdminGuard)
  @Get('admin-permissions')
  getAdminPermissions(@Req() request: { user: AuthUser }) {
    return this.userService.getEffectiveAdminPermissions(request.user);
  }

  private getHeaderValue(request: LoginRequest, key: string) {
    const value = request.headers[key];
    return Array.isArray(value) ? value[0] : value;
  }
}
