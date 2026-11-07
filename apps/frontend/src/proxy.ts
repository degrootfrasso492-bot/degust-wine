import { NextRequest, NextResponse } from 'next/server';

/**
 * Серверная проверка админских маршрутов до рендера.
 *
 * Раньше роль проверялась в useEffect после монтирования, поэтому контент
 * админки успевал мелькнуть у неавторизованного пользователя. Здесь читаем
 * несекретную cookie роли, которую backend выставляет вместе с httpOnly JWT.
 * Сами данные всё равно защищены backend-guard'ами; cookie нужна только
 * для маршрутизации и не содержит токена.
 */
export function proxy(request: NextRequest) {
  const role = request.cookies.get('degust_role')?.value;
  if (role === 'ADMIN') {
    return NextResponse.next();
  }

  const loginUrl = request.nextUrl.clone();
  const redirect = `${request.nextUrl.pathname}${request.nextUrl.search}`;
  loginUrl.pathname = '/login';
  loginUrl.search = '';
  loginUrl.searchParams.set('redirect', redirect);

  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ['/admin', '/admin/:path*'],
};
