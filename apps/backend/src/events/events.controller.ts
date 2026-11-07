import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Put,
  Body,
  Param,
  Query,
  UseGuards,
  UnauthorizedException,
} from '@nestjs/common';
import { EventsService } from './events.service';
import { CreateEventDto, UpdateEventDto } from './dto/event.dto';
import { CreateWineDto, UpdateWineDto } from './dto/wine.dto';
import { SetEventScalesDto } from './dto/scales.dto';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Public } from '../auth/decorators/public.decorator';
import { WineSerializer } from './wine.serializer';
import { Role } from '@prisma/client';

import { EventPhaseService } from './event-phase.service';
import { OptionalJwtAuthGuard } from './optional-jwt-auth.guard';
import { ScalesService } from '../scales/scales.service';

/**
 * Порядок статических маршрутов важен: Nest регистрирует их в порядке
 * объявления, и `GET :id` перехватил бы `join/:qrSlug`, `feed` и прочие
 * литеральные пути. Поэтому все статические сегменты объявлены ДО `:id`,
 * а сам `:id` объявлен последним среди GET-маршрутов.
 */
@Controller('events')
@UseGuards(RolesGuard)
export class EventsController {
  constructor(
    private eventsService: EventsService,
    
    private eventPhase: EventPhaseService,
    private scalesService: ScalesService,
  ) {}

  @Post()
  @Roles(Role.ADMIN)
  createEvent(@CurrentUser() user: any, @Body() dto: CreateEventDto) {
    return this.eventsService.createEvent(user.id, dto);
  }

  @Get()
  @Roles(Role.ADMIN)
  getEvents(@Query('page') page?: string, @Query('limit') limit?: string) {
    return this.eventsService.getEvents(
      page ? parseInt(page) : 1,
      limit ? parseInt(limit) : 20,
    );
  }

  @Public()
  @Get('feed')
  getFeed(@Query('page') page?: string, @Query('limit') limit?: string) {
    const parsedPage = parseInt(page ?? '', 10);
    const parsedLimit = parseInt(limit ?? '', 10);
    return this.eventsService.getFeed(
      Number.isNaN(parsedPage) ? 1 : parsedPage,
      Number.isNaN(parsedLimit) ? 20 : parsedLimit,
    );
  }

  /**
   * Присоединение по QR. Объявлено до `:id`, иначе `join/abc` уйдёт в `:id`.
   * Гостевой вход по QR удалён: доступ только авторизованным пользователям,
   * неавторизованный перенаправляется фронтендом на страницу входа.
   */
  @Get('join/:qrSlug')
  @UseGuards(JwtAuthGuard)
  async joinEvent(
    @Param('qrSlug') qrSlug: string,
    @Query('pin') pin?: string,
    @CurrentUser() user?: any,
  ) {
    if (!user?.id) {
      throw new UnauthorizedException('Необходима авторизация');
    }
    const event = await this.eventsService.joinByQrSlug(qrSlug, pin, user.id);
    return { event };
  }

  /**
   * Публичная карточка события: открывается из ленты без токена.
   * Токен не обязателен, но если он передан — роль берётся из него (ADMIN видит всё).
   */
  @Public()
  @UseGuards(OptionalJwtAuthGuard)
  @Get(':id/card')
  async getEventCard(@Param('id') id: string, @CurrentUser() user?: any) {
    return this.eventsService.getEventCard(id, user?.role ?? Role.USER);
  }

  /**
   * Публичная карточка события (основной маршрут).
   * Должен быть объявлен до `:id/qrcode` и до `:id`: литеральных сегментов
   * одинаковой длины здесь нет, конфликт исключён порядком и специфичностью.
   */
  @Public()
  @UseGuards(OptionalJwtAuthGuard)
  @Get(':id/public')
  getPublicEvent(@Param('id') id: string) {
    return this.eventsService.getPublicEvent(id);
  }

  @Get(':id/qrcode')
  @Roles(Role.ADMIN)
  getQrCode(@Param('id') id: string) {
    return this.eventsService.generateQrCode(id);
  }

  /** Легаси-маршрут для админки: полный объект события с винами. */
  @Get(':id/admin')
  @Roles(Role.ADMIN)
  getEventAdmin(@Param('id') id: string) {
    return this.eventsService.getEventById(id);
  }

  @Post(':eventId/wines')
  @Roles(Role.ADMIN)
  createWine(@Param('eventId') eventId: string, @Body() dto: CreateWineDto) {
    return this.eventsService.createWine(eventId, dto);
  }

  @Get(':eventId/wines')
  async getWines(
    @Param('eventId') eventId: string,
    @CurrentUser() user: any,
  ) {
    await this.eventPhase.assertWinesVisible(eventId, user.role);
    const wines = await this.eventsService.getWinesByEvent(eventId);
    const event = await this.eventsService.getEventById(eventId);

    return wines.map((wine) =>
      WineSerializer.toPublicDto(wine, event, user.role),
    );
  }

  @Patch(':eventId/wines/:id')
  @Roles(Role.ADMIN)
  updateWine(
    @Param('eventId') eventId: string,
    @Param('id') id: string,
    @Body() dto: UpdateWineDto,
  ) {
    return this.eventsService.updateWine(eventId, id, dto);
  }

  @Delete(':eventId/wines/:id')
  @Roles(Role.ADMIN)
  deleteWine(@Param('eventId') eventId: string, @Param('id') id: string) {
    return this.eventsService.deleteWine(eventId, id);
  }

  @Patch(':id')
  @Roles(Role.ADMIN)
  updateEvent(@Param('id') id: string, @Body() dto: UpdateEventDto) {
    return this.eventsService.updateEvent(id, dto);
  }

  /** Настройка шкал события (характеристики, задаваемые администратором). */
  @Put(':id/scales')
  @Roles(Role.ADMIN)
  setEventScales(@Param('id') id: string, @Body() dto: SetEventScalesDto) {
    return this.scalesService.setEventScales(id, dto.scaleSlugs);
  }

  @Delete(':id')
  @Roles(Role.ADMIN)
  deleteEvent(@Param('id') id: string) {
    return this.eventsService.deleteEvent(id);
  }

  /**
   * Публичная карточка события — сам `GET /events/:id`.
   * Объявлен последним среди GET, чтобы не перехватывать литеральные пути выше.
   */
  @Public()
  @UseGuards(OptionalJwtAuthGuard)
  @Get(':id')
  async getEvent(@Param('id') id: string, @CurrentUser() user?: any) {
    return this.eventsService.getEventCard(id, user?.role ?? Role.USER);
  }
}
