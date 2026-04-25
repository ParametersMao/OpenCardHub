import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { UserService } from '../user/user.service';
import type { LoginDto } from './dto/login.dto';
import type { AuthTokenPayload, AuthUser } from './auth.types';

@Injectable()
export class AuthService {
  constructor(
    private readonly configService: ConfigService,
    private readonly jwtService: JwtService,
    private readonly userService: UserService,
  ) {}

  async login(input: LoginDto) {
    const user = await this.userService.findByUsername(input.username);

    if (!user || !this.userService.verifyPassword(user, input.password)) {
      throw new UnauthorizedException('Invalid username or password.');
    }

    if (user.status !== 'active') {
      throw new UnauthorizedException('User is disabled.');
    }

    const authUser: AuthUser = {
      id: user.id.toString(),
      username: user.username,
      role: user.role,
      levelCode: user.levelCode,
    };

    return {
      accessToken: await this.sign(authUser),
      user: authUser,
    };
  }

  async verifyToken(token: string): Promise<AuthUser> {
    const payload = await this.jwtService.verifyAsync<AuthTokenPayload>(token, {
      secret: this.getJwtSecret(),
    });

    return {
      id: payload.sub,
      username: payload.username,
      role: payload.role,
      levelCode: payload.levelCode,
    };
  }

  private sign(user: AuthUser) {
    return this.jwtService.signAsync(
      {
        sub: user.id,
        username: user.username,
        role: user.role,
        levelCode: user.levelCode,
      },
      {
        secret: this.getJwtSecret(),
        expiresIn: '7d',
      },
    );
  }

  private getJwtSecret() {
    return this.configService.get<string>('JWT_SECRET', 'opencardhub-dev-secret');
  }
}
