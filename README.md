# Drinx-edu — система усреднённых дегустационных заметок

Веб-приложение для ведения усреднённых дегустационных заметок по методике WSET SAT.
Участники оценивают образцы (вино и крепкий алкоголь) по заданным характеристикам и
выбирают дескрипторы аромата/вкуса, а по итогам дегустации система формирует рейтинг
образцов, средние оценки и топ дескрипторов.

## Возможности

### Для участников
- Публичная лента дегустаций (доступна и без входа) — название, дата, топ образцов по лайкам для завершённых дегустаций.
- Карточка дегустации с фазами: **Скоро → Идёт сейчас → Завершена** (по часовому поясу события).
- Заметки и лайки доступны только в фазу `OPEN`, автосохранение с debounce без кнопки «Сохранить».
- Оценка характеристик (сладость, кислотность, танины, тело, алкоголь, сложность — состав задаёт администратор).
- «Вкусоароматика»: выбор аромата и вкуса из единого дерева дескрипторов (для вина — свой список, для крепкого — свой).
- Слепая дегустация с поэтапным раскрытием информации (SSE-сигнал при завершении).
- Личный кабинет: профиль (редактирование имени и аватара), **Избранное**, **Все образцы** (история заметок с пагинацией), **Дегустации** (посещённые события).
- **Каталог**: поиск, сортировка (по лайкам/по новизне) и фильтры (тип, категория, страна) по завершённым дегустациям; лайки показываются как среднее по числу дегустаций.

### Для организаторов (администраторов)
- Административная панель: список, создание, редактирование и удаление дегустаций.
- Заполнение карточки образца: фото, категория, крепость, состав, производитель, страна, регион, выдержка, методы производства, описание.
- Загрузка фото образцов и обложек событий.
- Настройка характеристик оценки (шкал) — вручную или пресетами по типу.
- Генерация QR-кода входа и PIN-кода доступа.
- Завершение/переоткрытие дегустации, удаление.
- Экспорт итогов: PDF-буклет (A4) и Excel-матрица (фоновые задачи со статусами в БД).

### Аналитика
- Рейтинг образцов по количеству лайков.
- Средние оценки по каждой характеристике.
- Топ дескрипторов аромата и вкуса (раздельно, по каждому образцу).
- Сырая матрица оценок участников (только для администратора).

## Технологии

- **Frontend**: Next.js 16 (App Router) + React 19 + TypeScript + Tailwind CSS 4 + TanStack Query + Zustand
- **Backend**: NestJS 12 + TypeScript + REST API + SSE
- **База данных**: PostgreSQL + Prisma ORM 7 (миграции, сиды)
- **Очереди**: фоновые задачи экспорта (PDF/Excel) со статусами, хранящимися в БД
- **Хранилище**: локальная папка `uploads/` со статической раздачей (для S3/MinIO — замена драйвера в `UploadsService`)
- **Авторизация**: JWT + вход по email/телефону с паролем (OAuth VK ID / Яндекс ID реализован на бэкенде, кнопки входа на фронте скрыты до запуска)

## Структура проекта

```
degust-web/
├── apps/
│   ├── frontend/               # Next.js приложение (App Router)
│   │   ├── public/             # manifest.json, PWA-иконки
│   │   └── src/
│   │       ├── app/            # маршруты: лента, дегустация, итоги, профиль, каталог, админка
│   │       ├── components/     # UI-компоненты (карточки, WSET-колесо, формы админки)
│   │       ├── hooks/          # use-debounced-save, use-require-admin
│   │       ├── lib/            # api-client, константы
│   │       ├── store/          # zustand-сторы (auth, tasting)
│   │       └── types/          # общие типы API
│   └── backend/                # NestJS API
│       ├── prisma/             # schema.prisma, миграции, сиды
│       └── src/
│           ├── auth/           # JWT, OAuth VK/Яндекс, guard-ы, декораторы
│           ├── events/         # события, фазы, лента, SSE, QR
│           ├── notes/          # дегустационные заметки (upsert, история, избранное)
│           ├── wset/           # дерево дескрипторов (вино / крепкое)
│           ├── scales/         # шкалы характеристик и пресеты
│           ├── analytics/      # усреднение и агрегация итогов
│           ├── export/         # PDF/Excel-экспорт (задачи в БД)
│           ├── uploads/        # загрузка изображений
│           ├── catalog/        # каталог завершённых образцов
│           └── health/         # healthcheck-эндпоинт
├── docker-compose.yml          # Dev-инфраструктура (только PostgreSQL)
├── docker-compose.prod.yml     # Production-окружение (postgres + migrate + backend + frontend)
├── .dockerignore
└── README.md
```

## Быстрый старт (локально)

### Требования
- Node.js ≥ 20
- pnpm ≥ 9
- Docker и Docker Compose (для PostgreSQL)

### Установка

```bash
git clone <repo-url>
cd degust-web

# Установить зависимости
pnpm install

# Поднять PostgreSQL
docker compose up -d

# Создать файл окружения бэкенда из примера
cp .env.example apps/backend/.env

# Применить миграции БД (включая справочник шкал характеристик и пресеты)
pnpm db:migrate

# Заполнить деревья дескрипторов и демо-данные
pnpm db:seed

# Запустить в режиме разработки
pnpm dev
```

- Frontend: `http://localhost:3000`
- Backend API: `http://localhost:4000/api`

### Демо-данные

Сид создаёт:
- Демо-событие «Демо слепая дегустация» (слепая, в фазе `OPEN`, PIN `1234`, 3 вина). Вход по QR: `http://localhost:3000/join/demo-blind-tasting`.
- Пользователей-фикстуры `admin@degust.local` (роль `ADMIN`) и `user@degust.local` (роль `USER`) — **без пароля**, только как авторы демо-события.
- Полные деревья дескрипторов для вина (Первичные/Вторичные/Третичные) и крепкого алкоголя (Сырьё/Производство/Выдержка/Добавки).

Библиотека шкал характеристик (сладость, кислотность, танины, тело, алкоголь, сложность) и пресеты создаются миграцией.

## Авторизация

Вход выполняется по email или номеру телефона с паролем, либо через OAuth-провайдеров:

- **Email/телефон + пароль**: `POST /api/auth/register` и `POST /api/auth/login`. Идентификатор определяется автоматически (по наличию `@` — email, иначе телефон).
- **VK ID / Яндекс ID**: бэкенд-эндпоинты `/api/auth/vk` и `/api/auth/yandex` реализованы (токен возвращается во фрагменте URL `/auth/callback#token=...`), но кнопки входа на `/login` временно скрыты — код оставлен для будущего запуска.
- **Гостевой вход по QR**: при сканировании QR без авторизации создаётся гостевая сессия, позволяющая вести заметки.

## Роли и административная панель

Роли: `ADMIN` и `USER`. Только `ADMIN` имеет доступ к админке `/admin` и административным эндпоинтам.

### Как стать администратором

Сид-пользователь `admin@degust.local` не имеет пароля и используется только как автор демо-события.
Для реального доступа:

1. Зарегистрируйтесь обычным способом на `/login`.
2. Повысьте роль пользователя до `ADMIN` в базе:

   ```sql
   UPDATE users SET role = 'ADMIN' WHERE email = 'ваш@email.com';
   ```

3. Войдите заново — на главной появится ссылка «Управление», ведущая в `/admin`.

## Переменные окружения

Полные примеры — в `.env.example` (dev) и `.env.production.example` (production).

### Backend (`apps/backend/.env`)

| Переменная | Обязательна | Описание |
|---|---|---|
| `DATABASE_URL` | да | Строка подключения PostgreSQL |
| `JWT_SECRET` | в prod | Секрет подписи JWT (в dev есть fallback) |
| `JWT_EXPIRES_IN` | нет | Время жизни токена (по умолчанию `7d`) |
| `FRONTEND_URL` | нет | Адрес фронта (CORS и редирект OAuth), по умолчанию `http://localhost:3000` |
| `BACKEND_URL` | нет | Публичный адрес бэкенда (редиректы OAuth, URL загрузок), по умолчанию `http://localhost:4000` |
| `BACKEND_PORT` | нет | Порт бэкенда (по умолчанию `4000`) |
| `VK_CLIENT_ID` / `VK_CLIENT_SECRET` | для VK | Креды приложения VK ID |
| `YANDEX_CLIENT_ID` / `YANDEX_CLIENT_SECRET` | для Яндекса | Креды приложения Яндекс ID |
| `NODE_ENV` | нет | В `production` отсутствие `JWT_SECRET` приводит к ошибке при старте |

### Frontend (`apps/frontend/.env.local`)

| Переменная | Обязательна | Описание |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | нет | Адрес бэкенда, доступный браузеру (по умолчанию `http://localhost:4000`); зашивается на этапе сборки |

## Production Deploy

Проект собирается в Docker-образы и запускается через `docker-compose.prod.yml`.
Состав: PostgreSQL, одноразовый сервис миграций (`migrate`), backend (порт `4000`) и frontend (порт `3000`).
Загруженные изображения хранятся в volume `uploads_data`.

> Примечание: образы содержат полный `node_modules` (включая виртуальный store pnpm
> `node_modules/.pnpm`), т.к. pnpm хранит пакеты в нём, а в `apps/*/node_modules` —
> симлинки. Это гарантирует работоспособность рантайма ценой большего размера образа.

### 1. Подготовьте окружение

```bash
cp .env.production.example .env
# отредактируйте .env: пароль БД, JWT_SECRET, домены FRONTEND_URL/BACKEND_URL/BACKEND_PUBLIC_URL
```

### 2. Соберите и запустите

```bash
docker compose -f docker-compose.prod.yml build
docker compose -f docker-compose.prod.yml up -d
```

Миграции применяются автоматически сервисом `migrate` (ожидает готовности PostgreSQL).

### 3. Одноразово загрузите справочники дескрипторов

Деревья дескрипторов («Вкусоароматика») наполняются сидом, а не миграцией.
Выполните **один раз** при первичной установке (повторный запуск очищает и пересоздаёт
дескрипторы, поэтому не запускайте его на каждом деплое):

```bash
docker compose -f docker-compose.prod.yml run --rm backend npx prisma db seed
```

### 4. Создайте администратора

Зарегистрируйтесь на `/login`, затем повысьте роль в базе:

```bash
docker compose -f docker-compose.prod.yml exec postgres \
  psql -U ${POSTGRES_USER:-degust} -d ${POSTGRES_DB:-degust_db} \
  -c "UPDATE users SET role = 'ADMIN' WHERE email = 'ваш@email.com';"
```

### Проверка работоспособности

```bash
curl http://localhost:4000/api/health   # → {"status":"ok",...}
curl -I http://localhost:3000           # → HTTP/2 200
```

### Реверс-прокси (опционально)

Для продакшена рекомендуется выставить приложение за nginx/Caddy с TLS. При
однодоменной схеме (фронт и API на одном домене) в `.env` задайте:

```
FRONTEND_URL=https://drinx-edu.example.com
BACKEND_URL=https://drinx-edu.example.com
BACKEND_PUBLIC_URL=https://drinx-edu.example.com/api
```

и проксируйте `/` на `frontend:3000`, а `/api` и `/uploads` — на `backend:4000`.

## API (основные маршруты)

Все маршруты имеют префикс `/api`. Глобально применена JWT-аутентификация; публичные маршруты помечены `@Public`, административные — `@Roles(ADMIN)`.

| Метод и путь | Доступ | Описание |
|---|---|---|
| `GET /health` | public | Healthcheck |
| `POST /auth/register` | public | Регистрация (email/телефон + пароль) |
| `POST /auth/login` | public | Вход |
| `GET /auth/me` | auth | Текущий пользователь |
| `PATCH /auth/me` | auth | Обновить имя и/или аватар |
| `GET /auth/vk`, `GET /auth/yandex` | public | Редирект на OAuth-провайдера |
| `GET /events/feed` | public | Лента дегустаций |
| `GET /events/:id` | public | Карточка дегустации (с образцами и итогами по ролям) |
| `GET /events/join/:qrSlug` | public | Вход по QR (гость или участник) |
| `GET /events/:id/stream` | public | SSE-стрим сигнала раскрытия |
| `POST /events` | admin | Создать дегустацию |
| `GET /events` | admin | Список дегустаций |
| `PATCH /events/:id` | admin | Обновить событие (в т.ч. завершить) |
| `DELETE /events/:id` | admin | Удалить событие |
| `GET /events/:id/qrcode` | admin | QR-код входа |
| `POST /events/:eventId/wines` | admin | Добавить образец |
| `PATCH /events/:eventId/wines/:id` | admin | Обновить образец |
| `DELETE /events/:eventId/wines/:id` | admin | Удалить образец |
| `PUT /events/:id/scales` | admin | Задать характеристики события |
| `POST /notes/upsert` | auth | Создать/обновить заметку |
| `GET /notes/wine/:wineId` | auth | Заметка по образцу |
| `GET /notes/me/liked` | auth | Избранное |
| `GET /notes/me/history` | auth | Все заметки (с пагинацией) |
| `GET /notes/me/events` | auth | Посещённые дегустации |
| `GET /wset/descriptors?wineType=WINE\|SPIRIT` | public | Дерево дескрипторов |
| `GET /scales`, `GET /scales/presets` | public | Справочник шкал и пресетов |
| `GET /catalog` | public | Каталог завершённых образцов (поиск/фильтр/сортировка) |
| `GET /analytics/events/:eventId` | public после CLOSED / admin | Итоги дегустации |
| `GET /analytics/events/:eventId/matrix` | admin | Матрица оценок |
| `POST /export/events/:eventId/pdf` | admin | Запустить PDF-экспорт |
| `POST /export/events/:eventId/excel` | admin | Запустить Excel-экспорт |
| `GET /export/jobs/:jobId/status` | admin | Статус задачи экспорта |
| `GET /export/jobs/:jobId/download` | admin | Скачать файл |
| `POST /uploads/image` | admin | Загрузить изображение (multipart `file`) |
| `POST /uploads/avatar` | auth | Загрузить аватар профиля (multipart `file`) |

## Тесты

```bash
cd apps/backend
pnpm test
```

Покрывают логику фаз дегустации (`event-phase`) и выбор топ-образцов в ленте (`event-feed`).

## Лицензия

MIT
