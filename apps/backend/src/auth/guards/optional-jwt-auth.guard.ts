import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/**
 * Необязательная аутентификация для публичных маршрутов.
 *
 * Глобальный JwtAuthGuard пропускает @Public() маршруты целиком, из-за чего
 * request.user остаётся пустым даже при переданном токене. Этот охранник
 * пытается разобрать токен, но в отличие от обычного JwtAuthGuard:
 *  - при отсутствии/невалидности токена не бросает 401, а оставляет user пустым;
 *  - при валидном токене кладёт пользователя в request.user.
 *
 * Нужен, чтобы ADMIN/участник на публичной карточке события получали свою роль,
 * а гость — роль USER.
 */
@Injectable()
export class OptionalJwtAuthGuard extends AuthGuard('jwt') {
  handleRequest<TUser = any>(_err: any, user: any): TUser {
    return (user ?? undefined) as TUser;
  }
}
