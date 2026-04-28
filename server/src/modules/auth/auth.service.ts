import {
  HttpException,
  HttpStatus,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import type ms from 'ms';
import { UserService } from '../user/user.service';
import type { LoginDto } from './dto/login.dto';
import type { AuthTokenPayload, AuthUser } from './auth.types';

interface LoginContext {
  ip?: string;
  userAgent?: string;
}

interface LoginAttemptState {
  count: number;
  firstAttemptAt: number;
  lockedUntil?: number;
}

@Injectable()
export class AuthService {
  private readonly loginAttempts = new Map<string, LoginAttemptState>();
  private readonly loginRateLimits = new Map<
    string,
    {
      count: number;
      windowStartedAt: number;
    }
  >();

  constructor(
    private readonly configService: ConfigService,
    private readonly jwtService: JwtService,
    private readonly userService: UserService,
  ) {}

  async login(input: LoginDto, context: LoginContext = {}) {
    this.assertLoginRateLimit(context);
    this.assertLoginNotLocked(input.username, context);

    const user = await this.userService.findByUsername(input.username);

    if (!user || !this.userService.verifyPassword(user, input.password)) {
      this.recordFailedLogin(input.username, context);
      throw new UnauthorizedException('Invalid username or password.');
    }

    if (user.status !== 'active') {
      this.recordFailedLogin(input.username, context);
      throw new UnauthorizedException('User is disabled.');
    }

    this.clearFailedLogin(input.username, context);

    if (this.userService.needsPasswordRehash(user)) {
      await this.userService.updatePasswordHash(user.id, input.password);
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
    let payload: AuthTokenPayload;

    try {
      payload = await this.jwtService.verifyAsync<AuthTokenPayload>(token, {
        secret: this.getJwtSecret(),
      });
    } catch {
      throw new UnauthorizedException('Invalid or expired token.');
    }

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
        expiresIn: this.getJwtExpiresIn(),
      },
    );
  }

  private getJwtSecret() {
    return this.configService.get<string>('JWT_SECRET', 'opencardhub-dev-secret');
  }

  private getJwtExpiresIn(): number | ms.StringValue {
    return this.configService.get<ms.StringValue>('JWT_EXPIRES_IN', '7d');
  }

  private assertLoginRateLimit(context: LoginContext) {
    const now = Date.now();
    const windowMs = 60_000;
    const limit = this.configService.get<number>('LOGIN_RATE_LIMIT_PER_MINUTE', 20);
    const key = this.normalizeIp(context.ip);
    const current = this.loginRateLimits.get(key);

    if (!current || now - current.windowStartedAt > windowMs) {
      this.loginRateLimits.set(key, {
        count: 1,
        windowStartedAt: now,
      });
      return;
    }

    current.count += 1;

    if (current.count > limit) {
      throw this.createTooManyRequestsException('Too many login requests.');
    }
  }

  private assertLoginNotLocked(username: string, context: LoginContext) {
    const key = this.createAttemptKey(username, context);
    const current = this.loginAttempts.get(key);

    if (!current?.lockedUntil) {
      return;
    }

    if (current.lockedUntil <= Date.now()) {
      this.loginAttempts.delete(key);
      return;
    }

    throw this.createTooManyRequestsException(
      'Too many failed login attempts. Please try again later.',
    );
  }

  private recordFailedLogin(username: string, context: LoginContext) {
    const now = Date.now();
    const key = this.createAttemptKey(username, context);
    const maxAttempts = this.configService.get<number>('LOGIN_MAX_ATTEMPTS', 5);
    const lockMinutes = this.configService.get<number>('LOGIN_LOCK_MINUTES', 15);
    const windowMs = lockMinutes * 60_000;
    const current = this.loginAttempts.get(key);
    const next =
      !current || now - current.firstAttemptAt > windowMs
        ? {
            count: 1,
            firstAttemptAt: now,
          }
        : {
            ...current,
            count: current.count + 1,
          };

    if (next.count >= maxAttempts) {
      next.lockedUntil = now + windowMs;
    }

    this.loginAttempts.set(key, next);
  }

  private clearFailedLogin(username: string, context: LoginContext) {
    this.loginAttempts.delete(this.createAttemptKey(username, context));
  }

  private createAttemptKey(username: string, context: LoginContext) {
    return `${username.trim().toLowerCase()}:${this.normalizeIp(context.ip)}`;
  }

  private normalizeIp(ip: string | undefined) {
    return ip?.split(',')[0]?.trim() || 'unknown';
  }

  private createTooManyRequestsException(message: string) {
    return new HttpException(message, HttpStatus.TOO_MANY_REQUESTS);
  }
}
