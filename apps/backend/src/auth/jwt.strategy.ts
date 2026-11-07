import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PrismaService } from '../prisma/prisma.service';
import { getJwtSecret } from './jwt-secret';
import { AUTH_COOKIE, readCookie } from './auth-cookies';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private prisma: PrismaService) {
    super({
      // Основной транспорт — httpOnly-cookie; Bearer оставлен для API-клиентов
      // и обратной совместимости.
      jwtFromRequest: ExtractJwt.fromExtractors([
        ExtractJwt.fromAuthHeaderAsBearerToken(),
        (request: { headers?: { cookie?: string } }) =>
          readCookie(request?.headers?.cookie, AUTH_COOKIE),
      ]),
      ignoreExpiration: false,
      secretOrKey: getJwtSecret(),
    });
  }

  async validate(payload: any) {
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
    });
    if (!user) return null;
    // Keep the password hash off request.user so it can't leak via /auth/me.
    const { passwordHash: _omit, ...safeUser } = user;
    return safeUser;
  }
}
