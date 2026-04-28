import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Put,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { AuthUser } from '../auth/auth.types';
import { AdminGuard } from '../auth/admin.guard';
import { AdminPermissionGuard } from '../auth/admin-permission.guard';
import { ADMIN_PERMISSIONS } from '../auth/admin-permissions';
import { RequireAdminPermission } from '../auth/require-admin-permission.decorator';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateAdminPermissionDto } from './dto/update-admin-permission.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserService } from './user.service';

interface AuthenticatedRequest {
  user: AuthUser;
  ip?: string;
  headers: Record<string, string | string[] | undefined>;
}

@UseGuards(AdminGuard, AdminPermissionGuard)
@RequireAdminPermission(ADMIN_PERMISSIONS.usersManage)
@Controller('users')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get()
  listUsers() {
    return this.userService.listUsers();
  }

  @Get('admin-permission-options')
  listAdminPermissionOptions() {
    return this.userService.listAdminPermissionOptions();
  }

  @Get(':id/admin-permissions')
  listAdminPermissions(@Param('id') id: string) {
    return this.userService.listAdminPermissions(id);
  }

  @Post()
  createUser(@Body() input: CreateUserDto) {
    return this.userService.createUser(input);
  }

  @Put(':id/admin-permissions/:permission')
  updateAdminPermission(
    @Param('id') id: string,
    @Param('permission') permission: string,
    @Body() input: UpdateAdminPermissionDto,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.userService.updateAdminPermission(
      id,
      permission,
      input,
      this.createAuditContext(request),
    );
  }

  @Patch(':id')
  updateUser(
    @Param('id') id: string,
    @Body() input: UpdateUserDto,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.userService.updateUser(id, input, this.createAuditContext(request));
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
