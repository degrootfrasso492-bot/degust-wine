import type { WineCategory, WineType } from '@/types/api';

export const WINE_CATEGORY_LABEL: Record<WineCategory, string> = {
  RED: 'Красное',
  WHITE: 'Белое',
  ROSE: 'Розовое',
  SPARKLING: 'Игристое',
  FORTIFIED: 'Креплёное',
  SWEET: 'Сладкое',
  VODKA: 'Водка',
  DISTILLATE: 'Дистиллят',
  COGNAC: 'Коньяк',
  WHISKY: 'Виски',
  TEQUILA: 'Текилла',
  GIN: 'Джин',
  LIQUEUR: 'Ликёр',
};

export const WINE_CATEGORIES = Object.keys(WINE_CATEGORY_LABEL) as WineCategory[];

/** Категории, относящиеся к типу «Вино». */
export const WINE_TYPE_CATEGORIES: WineCategory[] = [
  'RED',
  'WHITE',
  'ROSE',
  'SPARKLING',
  'FORTIFIED',
  'SWEET',
];

/** Категории, относящиеся к типу «Крепкий алкоголь». */
export const SPIRIT_TYPE_CATEGORIES: WineCategory[] = [
  'VODKA',
  'DISTILLATE',
  'COGNAC',
  'WHISKY',
  'TEQUILA',
  'GIN',
  'LIQUEUR',
];

/** Тип алкоголя по категории образца (вино / крепкое). */
export function getWineType(category: WineCategory): WineType {
  return SPIRIT_TYPE_CATEGORIES.includes(category) ? 'SPIRIT' : 'WINE';
}

export const TIMEZONES = [
  'Europe/Moscow',
  'Europe/Kaliningrad',
  'Europe/Samara',
  'Asia/Yekaterinburg',
  'Asia/Omsk',
  'Asia/Krasnoyarsk',
  'Asia/Irkutsk',
  'Asia/Yakutsk',
  'Asia/Vladivostok',
  'Asia/Magadan',
  'Asia/Kamchatka',
  'Europe/Minsk',
  'Asia/Almaty',
  'Asia/Tashkent',
  'Europe/Kiev',
  'Europe/Berlin',
  'Europe/London',
  'America/New_York',
];
