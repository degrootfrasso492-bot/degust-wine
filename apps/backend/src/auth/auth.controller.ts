import {
  Controller,
  Post,
  Body,
  Get,
  Query,
  Req,
  Res,
  Patch,
  UseGuards,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { LoginDto, RegisterDto, UpdateProfileDto } from './dto/auth.dto';
import { Public } from './decorators/public.decorator';
import { CurrentUser } from './decorators/current-user.decorator';
import { AuthRateLimitGuard } from './guards/rate-limit.guard';
import { clearAuthCookies, readCookie, setAuthCookies } from './auth-cookies';
import {
  clearOAuthStateCookie,
  createOAuthState,
  OAUTH_STATE_COOKIE,
  setOAuthStateCookie,
  verifyOAuthState,
} from './oauth-state';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Public()
  @UseGuards(AuthRateLimitGuard)
  @Post('register')
  async register(
    @Body() dto: RegisterDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.authService.register(
      dto.identifier,
      dto.password,
      dto.name,
    );
    // Токен живёт только в httpOnly-cookie и не попадает в JS/body ответа.
    setAuthCookies(res, result.accessToken, result.user.role);
    return { user: result.user };
  }

  @Public()
  @UseGuards(AuthRateLimitGuard)
  @Post('login')
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.authService.login(dto.identifier, dto.password);
    setAuthCookies(res, result.accessToken, result.user.role);
    return { user: result.user };
  }

  @Public()
  @Post('logout')
  logout(@Res({ passthrough: true }) res: Response) {
    clearAuthCookies(res);
    return { success: true };
  }

  @Get('me')
  getMe(@CurrentUser() user: any) {
    return user;
  }

  @Patch('me')
  updateProfile(@CurrentUser() user: any, @Body() dto: UpdateProfileDto) {
    return this.authService.updateProfile(user.id, dto);
  }

  @Public()
  @Get('vk')
  vkLogin(@Res() res: Response) {
    const state = createOAuthState('vk');
    setOAuthStateCookie(res, state);

    const params = new URLSearchParams({
      client_id: process.env.VK_CLIENT_ID ?? '',
      redirect_uri: `${process.env.BACKEND_URL}/api/auth/vk/callback`,
      response_type: 'code',
      scope: 'email',
      state,
    });
    res.redirect(`https://oauth.vk.com/authorize?${params}`);
  }

  @Public()
  @Get('yandex')
  yandexLogin(@Res() res: Response) {
    const state = createOAuthState('yandex');
    setOAuthStateCookie(res, state);

    const params = new URLSearchParams({
      response_type: 'code',
      client_id: process.env.YANDEX_CLIENT_ID ?? '',
      redirect_uri: `${process.env.BACKEND_URL}/api/auth/yandex/callback`,
      state,
    });
    res.redirect(`https://oauth.yandex.ru/authorize?${params}`);
  }

  @Public()
  @Get('vk/callback')
  async vkCallback(
    @Query('code') code: string,
    @Query('state') state: string,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    return this.handleOAuthCallback(res, req, 'vk', state, () =>
      this.authService.validateVkOAuth(code),
    );
  }

  @Public()
  @Get('yandex/callback')
  async yandexCallback(
    @Query('code') code: string,
    @Query('state') state: string,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    return this.handleOAuthCallback(res, req, 'yandex', state, () =>
      this.authService.validateYandexOAuth(code),
    );
  }

  /**
   * Browser flow: проверяет OAuth state, кладёт JWT в httpOnly-cookie и
   * возвращает пользователя на фронтенд. Токен больше не передаётся в URL.
   */
  private async handleOAuthCallback(
    res: Response,
    req: Request,
    provider: 'vk' | 'yandex',
    state: string | undefined,
    exchange: () => Promise<{ accessToken: string; user: { role: string } }>,
  ) {
    const frontUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const cookieValue = readCookie(req.headers.cookie, OAUTH_STATE_COOKIE);
    clearOAuthStateCookie(res);

    if (!verifyOAuthState(cookieValue, state, provider)) {
      res.redirect(`${frontUrl}/login?error=oauth_state`);
      return;
    }

    try {
      const { accessToken, user } = await exchange();
      setAuthCookies(res, accessToken, user.role);
      res.redirect(`${frontUrl}/auth/callback`);
    } catch {
      res.redirect(`${frontUrl}/login?error=oauth`);
    }
  }
}
