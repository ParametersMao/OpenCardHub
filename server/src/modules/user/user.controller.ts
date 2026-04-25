import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { AdminGuard } from '../auth/admin.guard';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserService } from './user.service';

@UseGuards(AdminGuard)
@Controller('users')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get()
  listUsers() {
    return this.userService.listUsers();
  }

  @Post()
  createUser(@Body() input: CreateUserDto) {
    return this.userService.createUser(input);
  }

  @Patch(':id')
  updateUser(@Param('id') id: string, @Body() input: UpdateUserDto) {
    return this.userService.updateUser(id, input);
  }
}
