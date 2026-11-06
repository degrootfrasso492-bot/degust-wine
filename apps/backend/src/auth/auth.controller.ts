import { Controller, Post, Body, Get, Query, Res, Patch } from '@nestjs/common';
import type { Response } from 'express';
import { AuthService } from './auth.service';
import { LoginDto, RegisterDto, UpdateProfileDto } from './dto/auth.dto';
import { Public } from './decorators/public.decorator';
import { CurrentUser } from './decorators/current-user.decorator';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Public()
  @Post('register')
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto.identifier, dto.password, dto.name);
  }

  @Public()
  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto.identifier, dto.password);
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
    const params = new URLSearchParams({
      client_id: process.env.VK_CLIENT_ID ?? '',
      redirect_uri: `${process.env.BACKEND_URL}/api/auth/vk/callback`,
      response_type: 'code',
      scope: 'email',
    });
    res.redirect(`https://oauth.vk.com/authorize?${params}`);
  }

  @Public()
  @Get('yandex')
  yandexLogin(@Res() res: Response) {
    const params = new URLSearchParams({
      response_type: 'code',
      client_id: process.env.YANDEX_CLIENT_ID ?? '',
      redirect_uri: `${process.env.BACKEND_URL}/api/auth/yandex/callback`,
    });
    res.redirect(`https://oauth.yandex.ru/authorize?${params}`);
  }

  @Public()
  @Get('vk/callback')
  async vkCallback(@Query('code') code: string, @Res() res: Response) {
    return this.finishOAuth(res, () => this.authService.validateVkOAuth(code));
  }

  @Public()
  @Get('yandex/callback')
  async yandexCallback(@Query('code') code: string, @Res() res: Response) {
    return this.finishOAuth(res, () =>
      this.authService.validateYandexOAuth(code),
    );
  }

  /**
   * Browser flow: send the user back to the frontend. The token goes in the URL
   * fragment (not the query string) so it is never sent to a server, written to
   * access logs, or leaked through the Referer header.
   */
  private async finishOAuth(
    res: Response,
    exchange: () => Promise<{ accessToken: string }>,
  ) {
    const frontUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    try {
      const { accessToken } = await exchange();
      res.redirect(
        `${frontUrl}/auth/callback#token=${encodeURIComponent(accessToken)}`,
      );
    } catch {
      res.redirect(`${frontUrl}/login?error=oauth`);
    }
  }
}
