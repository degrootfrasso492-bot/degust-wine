import 'dotenv/config';
import { PrismaClient, Role, WineCategory, WineType, Prisma } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

type DescriptorInput = {
  labelRu: string;
  children?: DescriptorInput[];
};

/**
 * Рекурсивно создаёт дескрипторы. slug строится детерминированно по индексам
 * в иерархии, чтобы повторный запуск сида давал те же идентификаторы.
 */
async function createDescriptor(
  parentId: string | null,
  input: DescriptorInput,
  sortOrder: number,
  wineType: WineType,
  level: number,
  category: string,
  slug: string,
): Promise<string> {
  const descriptor = await prisma.wsetDescriptor.create({
    data: {
      parentId,
      category,
      labelRu: input.labelRu,
      wineType,
      level,
      sortOrder,
      slug,
    },
  });

  const children = input.children ?? [];
  for (let i = 0; i < children.length; i++) {
    await createDescriptor(
      descriptor.id,
      children[i],
      i,
      wineType,
      level + 1,
      category,
      `${slug}-${i}`,
    );
  }

  return descriptor.id;
}

async function seedWsetDescriptors() {
  console.log('Seeding descriptors...');

  // Содержимое дескрипторов полностью заменяется списками «Вино» / «Крепкое».
  await prisma.noteDescriptor.deleteMany({});
  await prisma.wsetDescriptor.deleteMany({});

  const wineRoots: DescriptorInput[] = [
    {
      labelRu: 'Первичные ароматы и вкусы',
      children: [
        {
          labelRu: 'Фрукты и ягоды',
          children: [
            {
              labelRu: 'Садовые',
              children: [
                { labelRu: 'яблоко (зелёное, жёлтое, красное)' },
                { labelRu: 'груша' },
                { labelRu: 'дюшес' },
                { labelRu: 'айва' },
                { labelRu: 'виноград' },
              ],
            },
            {
              labelRu: 'Косточковые',
              children: [
                { labelRu: 'персик' },
                { labelRu: 'абрикос' },
                { labelRu: 'нектарин' },
              ],
            },
            {
              labelRu: 'Цитрусовые',
              children: [
                { labelRu: 'лимон' },
                { labelRu: 'цедра лимона' },
                { labelRu: 'лайм' },
                { labelRu: 'апельсин' },
                { labelRu: 'цедра апельсина' },
                { labelRu: 'грейпфрут' },
              ],
            },
            {
              labelRu: 'Тропические',
              children: [
                { labelRu: 'дыня' },
                { labelRu: 'манго' },
                { labelRu: 'маракуйя' },
                { labelRu: 'личи' },
                { labelRu: 'банан' },
                { labelRu: 'ананас' },
              ],
            },
            {
              labelRu: 'Красные ягоды',
              children: [
                { labelRu: 'клубника' },
                { labelRu: 'малина' },
                { labelRu: 'клюква' },
                { labelRu: 'брусника' },
                { labelRu: 'вишня' },
                { labelRu: 'красная слива' },
              ],
            },
            {
              labelRu: 'Чёрные ягоды',
              children: [
                { labelRu: 'чёрная смородина' },
                { labelRu: 'ежевика' },
                { labelRu: 'голубика' },
                { labelRu: 'черешня' },
                { labelRu: 'чёрная слива' },
              ],
            },
          ],
        },
        {
          labelRu: 'Цветочные тона',
          children: [
            { labelRu: 'яблоня' },
            { labelRu: 'бузина' },
            { labelRu: 'акация' },
            { labelRu: 'липа' },
            { labelRu: 'медоносы' },
            { labelRu: 'герань' },
            { labelRu: 'роза' },
            { labelRu: 'фиалка' },
          ],
        },
        {
          labelRu: 'Растительные и овощные тона',
          children: [
            { labelRu: 'лист чёрной смородины' },
            { labelRu: 'крыжовник' },
            { labelRu: 'трава' },
            { labelRu: 'спаржа' },
            { labelRu: 'зелёный болгарский перец' },
            { labelRu: 'томатный лист' },
            { labelRu: 'зелёный горошек' },
          ],
        },
        {
          labelRu: 'Травяные тона',
          children: [
            { labelRu: 'эвкалипт' },
            { labelRu: 'мята' },
            { labelRu: 'фенхель' },
            { labelRu: 'сушёный укроп' },
            { labelRu: 'анис' },
            { labelRu: 'пряные травы' },
          ],
        },
        {
          labelRu: 'Пряности',
          children: [
            { labelRu: 'чёрный перец' },
            { labelRu: 'белый перец' },
            { labelRu: 'лакрица' },
          ],
        },
        {
          labelRu: 'Минеральность',
          children: [
            { labelRu: 'мел' },
            { labelRu: 'мокрый камень' },
            { labelRu: 'кремний' },
          ],
        },
        {
          labelRu: 'Бензольные тона',
          children: [
            { labelRu: 'резина' },
            { labelRu: 'стирательная резинка' },
            { labelRu: 'пластилин' },
            { labelRu: 'нефть' },
            { labelRu: 'керосин' },
          ],
        },
      ],
    },
    {
      labelRu: 'Вторичные ароматы и вкусы',
      children: [
        {
          labelRu: 'Дрожжевые (осадок, автолиз, флор)',
          children: [
            {
              labelRu: 'Дрожжевые',
              children: [
                { labelRu: 'печенье' },
                { labelRu: 'хлеб' },
                { labelRu: 'тосты' },
                { labelRu: 'выпечка' },
                { labelRu: 'бриошь' },
                { labelRu: 'тесто' },
                { labelRu: 'сыр' },
                { labelRu: 'йогурт' },
              ],
            },
          ],
        },
        {
          labelRu: 'Малолактика',
          children: [
            { labelRu: 'сливочное масло' },
            { labelRu: 'сыр' },
            { labelRu: 'нуга' },
            { labelRu: 'сливки' },
            { labelRu: 'молочный шоколад' },
          ],
        },
        {
          labelRu: 'Выдержка в дубовой бочке (контакт с дубом)',
          children: [
            {
              labelRu: 'Сладкие специи',
              children: [
                { labelRu: 'ваниль' },
                { labelRu: 'гвоздика' },
                { labelRu: 'мускатный орех' },
                { labelRu: 'корица' },
              ],
            },
            {
              labelRu: 'Продукты горения',
              children: [
                { labelRu: 'кофе' },
                { labelRu: 'шоколад' },
                { labelRu: 'тосты' },
              ],
            },
            {
              labelRu: 'Жжёный сахар',
              children: [
                { labelRu: 'карамель' },
                { labelRu: 'ириска' },
                { labelRu: 'попкорн' },
              ],
            },
            {
              labelRu: 'Обжиг бочки',
              children: [
                { labelRu: 'обожжённая древесина' },
                { labelRu: 'дуб' },
                { labelRu: 'кедр' },
                { labelRu: 'смола' },
                { labelRu: 'дым' },
                { labelRu: 'кокос' },
              ],
            },
          ],
        },
      ],
    },
    {
      labelRu: 'Третичные ароматы и вкусы',
      children: [
        {
          labelRu: 'Развитие фруктов',
          children: [
            {
              labelRu: 'Белое вино',
              children: [
                { labelRu: 'курага' },
                { labelRu: 'апельсиновый мармелад' },
                { labelRu: 'сушёные яблоки' },
                { labelRu: 'сушёные бананы' },
              ],
            },
            {
              labelRu: 'Красное вино',
              children: [
                { labelRu: 'чернослив' },
                { labelRu: 'изюм' },
                { labelRu: 'мочёная брусника' },
                { labelRu: 'уваренные/сушёные ягоды' },
              ],
            },
          ],
        },
        {
          labelRu: 'Старение в бутылке',
          children: [
            {
              labelRu: 'Белое вино',
              children: [
                { labelRu: 'корица' },
                { labelRu: 'имбирь' },
                { labelRu: 'мускатный орех' },
                { labelRu: 'мёд' },
                { labelRu: 'орехи' },
                { labelRu: 'грибы' },
                { labelRu: 'сено' },
                { labelRu: 'гудрон' },
              ],
            },
            {
              labelRu: 'Красное вино',
              children: [
                { labelRu: 'кожа' },
                { labelRu: 'дичь' },
                { labelRu: 'мясные тона' },
                { labelRu: 'анималистика' },
                { labelRu: 'табак' },
                { labelRu: 'землистость' },
                { labelRu: 'подлесок' },
                { labelRu: 'сырая листва' },
                { labelRu: 'грибы' },
                { labelRu: 'овощные тона' },
              ],
            },
          ],
        },
        {
          labelRu: 'Намеренно окисленные вина',
          children: [
            { labelRu: 'миндаль' },
            { labelRu: 'фундук' },
            { labelRu: 'грецкий орех' },
            { labelRu: 'шоколад' },
            { labelRu: 'кофе' },
            { labelRu: 'карамель' },
          ],
        },
      ],
    },
  ];

  const spiritRoots: DescriptorInput[] = [
    {
      labelRu: 'Сырьё',
      children: [
        {
          labelRu: 'Зерновые',
          children: [
            { labelRu: 'сахарная кукуруза' },
            { labelRu: 'попкорн' },
            { labelRu: 'кукурузный хлеб' },
            { labelRu: 'солод' },
            { labelRu: 'овсяная каша / геркулес' },
            { labelRu: 'шелуха' },
            { labelRu: 'ржаной хлеб' },
            { labelRu: 'цедра' },
            { labelRu: 'перец горошком' },
          ],
        },
        {
          labelRu: 'Сахарный тростник',
          children: [
            { labelRu: 'трава' },
            { labelRu: 'травянистый оттенок' },
            { labelRu: 'стебли' },
            { labelRu: 'патока (меласса)' },
            { labelRu: 'карамель' },
            { labelRu: 'сахарная вата' },
          ],
        },
        {
          labelRu: 'Фрукты',
          children: [
            { labelRu: 'изюм' },
            { labelRu: 'кишмиш / султана' },
            { labelRu: 'финик' },
            { labelRu: 'инжир' },
            { labelRu: 'цветение деревьев' },
            { labelRu: 'бузина' },
            { labelRu: 'лаванда' },
            { labelRu: 'фиалка' },
            { labelRu: 'яблоко' },
            { labelRu: 'груша' },
            { labelRu: 'абрикос' },
            { labelRu: 'персик' },
            { labelRu: 'малина' },
            { labelRu: 'ежевика' },
            { labelRu: 'вишня' },
            { labelRu: 'слива' },
            { labelRu: 'марципан' },
            { labelRu: 'миндаль' },
          ],
        },
        {
          labelRu: 'Агава',
          children: [
            { labelRu: 'агава' },
            { labelRu: 'корнеплоды' },
            { labelRu: 'сладкий перец' },
            { labelRu: 'халапеньо' },
            { labelRu: 'травянистый тон' },
            { labelRu: 'перец горошком' },
            { labelRu: 'оливки' },
          ],
        },
      ],
    },
    {
      labelRu: 'Производство (до окончания дистилляции)',
      children: [
        {
          labelRu: 'Дым',
          children: [
            { labelRu: 'костёр' },
            { labelRu: 'йод' },
            { labelRu: 'торф' },
            { labelRu: 'морские водоросли' },
            { labelRu: 'дымный оттенок' },
          ],
        },
        {
          labelRu: 'Ферментация',
          children: [
            { labelRu: 'яблоко' },
            { labelRu: 'груша' },
            { labelRu: 'абрикос' },
            { labelRu: 'персик' },
            { labelRu: 'банан' },
            { labelRu: 'дыня' },
            { labelRu: 'манго' },
            { labelRu: 'ананас' },
            { labelRu: 'жасмин' },
            { labelRu: 'герань' },
            { labelRu: 'сирень' },
            { labelRu: 'роза' },
            { labelRu: 'шоколад' },
            { labelRu: 'кофе' },
            { labelRu: 'выпечка' },
            { labelRu: 'фундук' },
          ],
        },
        {
          labelRu: 'Головы',
          children: [
            { labelRu: 'краска' },
            { labelRu: 'растворитель' },
            { labelRu: 'лак' },
            { labelRu: 'уксус' },
          ],
        },
        {
          labelRu: 'Хвосты',
          children: [
            { labelRu: 'сыр' },
            { labelRu: 'немытые ноги / запах пота' },
            { labelRu: 'пластик' },
            { labelRu: 'воск' },
          ],
        },
        {
          labelRu: 'Сера',
          children: [
            { labelRu: 'тухлое яйцо' },
            { labelRu: 'канализация (стоки)' },
            { labelRu: 'мясной оттенок' },
            { labelRu: 'резина' },
            { labelRu: 'сгоревшая спичка' },
            { labelRu: 'дымность' },
          ],
        },
      ],
    },
    {
      labelRu: 'Выдержка (древесина и время)',
      children: [
        {
          labelRu: 'Древесина',
          children: [
            { labelRu: 'кедр' },
            { labelRu: 'опилки' },
            { labelRu: 'поджаренный тост' },
            { labelRu: 'обугленное дерево' },
            { labelRu: 'пекан' },
            { labelRu: 'херес' },
            { labelRu: 'ваниль' },
            { labelRu: 'кокос' },
            { labelRu: 'корица' },
            { labelRu: 'гвоздика' },
            { labelRu: 'мускатный орех' },
          ],
        },
        {
          labelRu: 'Время',
          children: [
            { labelRu: 'фруктовый кекс' },
            { labelRu: 'чернослив' },
            { labelRu: 'кожа' },
            { labelRu: 'табак' },
            { labelRu: 'какао' },
            { labelRu: 'кофе' },
            { labelRu: 'грибы' },
            { labelRu: 'земля' },
            { labelRu: 'грецкий орех' },
            { labelRu: 'полироль для мебели' },
          ],
        },
      ],
    },
    {
      labelRu: 'Добавки после дистилляции',
      children: [
        {
          labelRu: 'Ботаникалы (растительные компоненты)',
          children: [
            { labelRu: 'можжевельник' },
            { labelRu: 'семена кориандра' },
            { labelRu: 'кардамон' },
            { labelRu: 'тмин' },
            { labelRu: 'лимонная цедра' },
            { labelRu: 'лаймовая цедра' },
            { labelRu: 'апельсиновая цедра' },
            { labelRu: 'имбирь' },
            { labelRu: 'корень дягиля (ангелика)' },
            { labelRu: 'корень ириса' },
            { labelRu: 'корица' },
            { labelRu: 'гвоздика' },
            { labelRu: 'лакрица (солодка)' },
            { labelRu: 'анис' },
            { labelRu: 'фенхель' },
            { labelRu: 'мята' },
            { labelRu: 'лемонграсс' },
            { labelRu: 'базилик' },
            { labelRu: 'укроп' },
            { labelRu: 'розмарин' },
            { labelRu: 'шалфей' },
            { labelRu: 'тимьян (чабрец)' },
          ],
        },
      ],
    },
  ];

  for (let i = 0; i < wineRoots.length; i++) {
    await createDescriptor(
      null,
      wineRoots[i],
      i,
      WineType.WINE,
      1,
      wineRoots[i].labelRu,
      `wset-wine-${i}`,
    );
  }

  for (let i = 0; i < spiritRoots.length; i++) {
    await createDescriptor(
      null,
      spiritRoots[i],
      i,
      WineType.SPIRIT,
      1,
      spiritRoots[i].labelRu,
      `wset-spirit-${i}`,
    );
  }

  console.log('Descriptors seeded.');
}

async function seedUsers() {
  console.log('Seeding users...');
  const admin = await prisma.user.upsert({
    where: { email: 'admin@degust.local' },
    update: {},
    create: {
      email: 'admin@degust.local',
      role: Role.ADMIN,
      name: 'Администратор',
    },
  });

  const user = await prisma.user.upsert({
    where: { email: 'user@degust.local' },
    update: {},
    create: {
      email: 'user@degust.local',
      role: Role.USER,
      name: 'Пользователь',
    },
  });

  console.log(`Admin id: ${admin.id}, User id: ${user.id}`);
  return { admin, user };
}

async function seedDemoEvent() {
  console.log('Seeding demo event...');
  const admin = await prisma.user.findUnique({
    where: { email: 'admin@degust.local' },
  });
  if (!admin) throw new Error('Admin user not found');

  // Дата — сегодняшний день, чтобы демо-событие было в фазе OPEN сразу после
  // сида (по локальному дню события), и участники могли проверить внесение заметок.
  const demoDate = new Date();

  const event = await prisma.tastingEvent.upsert({
    where: { qrSlug: 'demo-blind-tasting' },
    update: { date: demoDate },
    create: {
      title: 'Демо слепая дегустация',
      description: 'Тестовое событие для демонстрации функциональности',
      date: demoDate,
      isClosed: false,
      isBlind: true,
      qrSlug: 'demo-blind-tasting',
      accessPin: '1234',
      coverUrl: null,
      creatorId: admin.id,
    },
  });

  console.log(`Demo event id: ${event.id}`);

  const winesData = [
    {
      orderIndex: 1,
      title: 'Шардоне, Калифорния',
      blindLabel: 'Образец №1',
      category: WineCategory.WHITE,
      abv: 13.5,
      composition: '100% Шардоне',
      producer: 'Dummy Winery',
      country: 'США',
      region: 'Калифорния',
      aging: 'Выдержка 6 месяцев в дубе',
      methods: 'Ферментация в стали',
      description: 'Свежее, фруктовое вино с ароматами яблока и цитрусовых.',
      photoUrl: null,
    },
    {
      orderIndex: 2,
      title: 'Пино Нуар, Бургундия',
      blindLabel: 'Образец №2',
      category: WineCategory.RED,
      abv: 13.0,
      composition: '100% Пино Нуар',
      producer: 'Domaine Test',
      country: 'Франция',
      region: 'Бургундия',
      aging: 'Выдержка 10 месяцев в нейтральных дубах',
      methods: 'Традиционная винификация',
      description: 'Элегантное красное с нотами красных ягод и земли.',
      photoUrl: null,
    },
    {
      orderIndex: 3,
      title: 'Рислинг, Мозель',
      blindLabel: 'Образец №3',
      category: WineCategory.WHITE,
      abv: 11.0,
      composition: '100% Рислинг',
      producer: 'Weingut Test',
      country: 'Германия',
      region: 'Мозель',
      aging: 'Короткая выдержка в стали',
      methods: 'Холодная ферментация',
      description: 'Яркая кислотность, лёгкое тело, ноты цитрусовых и белых цветов.',
      photoUrl: null,
    },
  ];

  for (const wineData of winesData) {
    const wine = await prisma.wine.upsert({
      where: {
        eventId_orderIndex: { eventId: event.id, orderIndex: wineData.orderIndex },
      },
      update: {},
      create: {
        eventId: event.id,
        orderIndex: wineData.orderIndex,
        title: wineData.title,
        blindLabel: wineData.blindLabel,
        category: wineData.category,
        abv: wineData.abv,
        composition: wineData.composition,
        producer: wineData.producer,
        country: wineData.country,
        region: wineData.region,
        aging: wineData.aging,
        methods: wineData.methods,
        description: wineData.description,
        photoUrl: wineData.photoUrl,
      },
    });

    console.log(`Wine ${wine.orderIndex} seeded: ${wine.id}`);
  }

  // Набор шкал события: все 6, т.к. демо содержит и красное, и белое вино.
  const scaleIds = ['sweetness', 'acidity', 'tannin', 'body', 'alcohol', 'complexity'];
  await prisma.eventAttributeSet.upsert({
    where: { eventId: event.id },
    update: {},
    create: {
      eventId: event.id,
      scales: {
        create: scaleIds.map((scaleId, i) => ({ scaleId, sortOrder: i })),
      },
    },
  });
}

async function main() {
  try {
    await seedUsers();
    await seedWsetDescriptors();
    await seedDemoEvent();
    console.log('Seed completed successfully.');
  } catch (e) {
    console.error('Seed failed:', e);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
