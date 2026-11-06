import {
  BadRequestException,
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';

const BCRYPT_ROUNDS = 12;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE = /^\+?\d{10,15}$/;

// Hash of a random string, used to keep login timing the same when the user
// does not exist.
const DUMMY_HASH = bcrypt.hashSync('dummy-password-for-timing', BCRYPT_ROUNDS);

type Identifier = { email: string } | { phone: string };

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  /** Never return passwordHash to clients. */
  private toPublicUser<T extends { passwordHash?: string | null }>(user: T) {
    const { passwordHash: _omit, ...rest } = user;
    return rest;
  }

  private issueToken(user: { id: string; role: string }) {
    return this.jwtService.sign({ sub: user.id, role: user.role });
  }

  private parseIdentifier(raw: string): Identifier {
    const value = raw.trim();
    if (value.includes('@')) {
      const email = value.toLowerCase();
      if (!EMAIL_RE.test(email)) {
        throw new BadRequestException('Некорректный email');
      }
      return { email };
    }
    const phone = value.replace(/[\s()\-]/g, '');
    if (!PHONE_RE.test(phone)) {
      throw new BadRequestException('Некорректный номер телефона');
    }
    return { phone };
  }

  async register(identifier: string, password: string, name?: string) {
    const where = this.parseIdentifier(identifier);

    const existing = await this.prisma.user.findUnique({ where });
    if (existing) {
      throw new ConflictException('Пользователь с такими данными уже существует');
    }

    const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
    try {
      const user = await this.prisma.user.create({
        data: {
          ...where,
          passwordHash,
          name: name?.trim() || null,
          role: 'USER',
        },
      });
      return {
        accessToken: this.issueToken(user),
        user: this.toPublicUser(user),
      };
    } catch (e: any) {
      // Unique constraint hit by a concurrent registration.
      if (e?.code === 'P2002') {
        throw new ConflictException(
          'Пользователь с такими данными уже существует',
        );
      }
      throw e;
    }
  }

  async login(identifier: string, password: string) {
    const where = this.parseIdentifier(identifier);
    const user = await this.prisma.user.findUnique({ where });

    // Always run bcrypt so response time doesn't reveal whether the account
    // exists. OAuth-only accounts have no passwordHash and can't use this path.
    const ok = await bcrypt.compare(password, user?.passwordHash ?? DUMMY_HASH);
    if (!user || !user.passwordHash || !ok) {
      throw new UnauthorizedException('Неверный логин или пароль');
    }

    return {
      accessToken: this.issueToken(user),
      user: this.toPublicUser(user),
    };
  }

  async validateVkOAuth(code: string) {
    if (!code) throw new UnauthorizedException('VK OAuth failed');
    const tokenRes = await fetch(
      `https://oauth.vk.com/access_token?client_id=${encodeURIComponent(process.env.VK_CLIENT_ID ?? '')}&client_secret=${encodeURIComponent(process.env.VK_CLIENT_SECRET ?? '')}&redirect_uri=${encodeURIComponent(`${process.env.BACKEND_URL}/api/auth/vk/callback`)}&code=${encodeURIComponent(code)}`,
    );
    const { access_token, user_id } = await tokenRes.json();
    if (!access_token) throw new UnauthorizedException('VK OAuth failed');

    const profileRes = await fetch(
      `https://api.vk.com/method/users.get?user_ids=${encodeURIComponent(String(user_id))}&fields=photo_200&access_token=${encodeURIComponent(access_token)}&v=5.131`,
    );
    const { response } = await profileRes.json();
    const profile = response?.[0];
    if (!profile) throw new UnauthorizedException('VK OAuth failed');

    const user = await this.prisma.user.upsert({
      where: { vkId: user_id.toString() },
      update: {},
      create: {
        vkId: user_id.toString(),
        name: `${profile.first_name} ${profile.last_name}`,
        avatar: profile.photo_200,
        role: 'USER',
      },
    });

    return {
      accessToken: this.issueToken(user),
      user: this.toPublicUser(user),
    };
  }

  async validateYandexOAuth(code: string) {
    if (!code) throw new UnauthorizedException('Yandex OAuth failed');
    const tokenRes = await fetch('https://oauth.yandex.ru/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        client_id: process.env.YANDEX_CLIENT_ID!,
        client_secret: process.env.YANDEX_CLIENT_SECRET!,
      }),
    });
    const { access_token } = await tokenRes.json();
    if (!access_token)
      throw new UnauthorizedException('Yandex OAuth failed');

    const profileRes = await fetch('https://login.yandex.ru/info', {
      headers: { Authorization: `OAuth ${access_token}` },
    });
    const profile = await profileRes.json();
    if (!profile?.id) throw new UnauthorizedException('Yandex OAuth failed');

    const user = await this.prisma.user.upsert({
      where: { yandexId: profile.id },
      update: {},
      create: {
        yandexId: profile.id,
        name: profile.display_name || profile.real_name,
        avatar: profile.default_avatar_id
          ? `https://avatars.yandex.net/get-yapic/${profile.default_avatar_id}/islands-200`
          : null,
        role: 'USER',
      },
    });

    return {
      accessToken: this.issueToken(user),
      user: this.toPublicUser(user),
    };
  }

  async createGuestUser() {
    const user = await this.prisma.user.create({
      data: { role: 'USER' },
    });
    return {
      accessToken: this.issueToken(user),
      user: this.toPublicUser(user),
    };
  }

  /** Обновляет имя и/или аватар текущего пользователя. */
  async updateProfile(
    userId: string,
    dto: { name?: string; avatar?: string },
  ) {
    const data: { name?: string | null; avatar?: string | null } = {};
    if (dto.name !== undefined) {
      data.name = dto.name.trim() || null;
    }
    if (dto.avatar !== undefined) {
      data.avatar = dto.avatar.trim() || null;
    }

    const user = await this.prisma.user.update({
      where: { id: userId },
      data,
    });
    return this.toPublicUser(user);
  }
}
