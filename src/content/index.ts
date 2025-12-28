import type { TableOfContents } from '../types';

export const tableOfContents: TableOfContents = {
  volumes: [
    {
      id: '1',
      title: 'Том 1: Подготовительная часть',
      description: 'Введение в учение Ламрим, значение духовного наставника и способы слушания Дхармы',
      sections: [
        {
          id: '1-01',
          volumeId: '1',
          title: 'Введение',
          slug: 'introduction',
          order: 1,
        },
        {
          id: '1-02',
          volumeId: '1',
          title: 'Как слушать и объяснять Дхарму',
          slug: 'listening-dharma',
          order: 2,
        },
        {
          id: '1-03',
          volumeId: '1',
          title: 'Вверение себя духовному наставнику',
          slug: 'spiritual-teacher',
          order: 3,
        },
      ],
    },
    {
      id: '4',
      title: 'Том 4: Безмятежность (шаматха)',
      description: 'Сущность медитации, правила практики безмятежности',
      sections: [
        {
          id: '4-01',
          volumeId: '4',
          title: 'Безмятежность (шаматха) — сущность медитации',
          slug: 'bezmyatezhnost-shamatkha-suschnost-meditatsii',
          order: 1,
        },
        {
          id: '4-02',
          volumeId: '4',
          title: 'Польза освоения безмятежности и проникновения',
          slug: '1-polza-osvoeniya-bezmyatezhnosti-i-proniknoveniya',
          order: 2,
        },
        {
          id: '4-03',
          volumeId: '4',
          title: 'Безмятежность и проникновение заключают в себе все самадхи',
          slug: '2-ukazanie-chto-bezmyatezhnost-i-proniknovenie',
          order: 3,
        },
        {
          id: '4-04',
          volumeId: '4',
          title: 'Сущность безмятежности и проникновения',
          slug: '3-suschnost-bezmyatezhnosti-i-proniknoveniya',
          order: 4,
        },
        {
          id: '4-05',
          volumeId: '4',
          title: 'Правила практики безмятежности',
          slug: 'i-pravila-praktiki-bezmyatezhnosti',
          order: 5,
        },
        {
          id: '4-06',
          volumeId: '4',
          title: 'Порядок созерцания',
          slug: 'b-poryadok-sozertsaniya',
          order: 6,
        },
        {
          id: '4-07',
          volumeId: '4',
          title: 'Правила порождения безупречного самадхи',
          slug: '1-pravila-porozhdeniya-bezuprechnogo-samadkhi',
          order: 7,
        },
        {
          id: '4-08',
          volumeId: '4',
          title: 'Метод осуществления степеней с помощью шести сил',
          slug: 'b-metod-osuschestvleniya-etikh-stepeney-s-pomoschy',
          order: 8,
        },
        {
          id: '4-09',
          volumeId: '4',
          title: 'Участие четырех видов внимания',
          slug: 'v-uchastie-chetyrekh-vidov-vnimaniya',
          order: 9,
        },
        {
          id: '4-10',
          volumeId: '4',
          title: 'Мера осуществления безмятежности',
          slug: '1-razgranichenie-dostizheniya-i-nedostizheniya-bez',
          order: 10,
        },
      ],
    },
  ],
};

// Функция для получения раздела по ID
export function getSectionById(sectionId: string) {
  for (const volume of tableOfContents.volumes) {
    const section = volume.sections.find((s) => s.id === sectionId);
    if (section) {
      return { section, volume };
    }
  }
  return null;
}

// Функция для получения следующего раздела
export function getNextSection(sectionId: string) {
  const result = getSectionById(sectionId);
  if (!result) return null;

  const { volume } = result;
  const currentIndex = volume.sections.findIndex((s) => s.id === sectionId);

  // Следующий раздел в этом томе
  if (currentIndex < volume.sections.length - 1) {
    return volume.sections[currentIndex + 1];
  }

  // Первый раздел следующего тома
  const volumeIndex = tableOfContents.volumes.findIndex((v) => v.id === volume.id);
  if (volumeIndex < tableOfContents.volumes.length - 1) {
    const nextVolume = tableOfContents.volumes[volumeIndex + 1];
    return nextVolume.sections[0] || null;
  }

  return null;
}

// Функция для получения предыдущего раздела
export function getPrevSection(sectionId: string) {
  const result = getSectionById(sectionId);
  if (!result) return null;

  const { volume } = result;
  const currentIndex = volume.sections.findIndex((s) => s.id === sectionId);

  // Предыдущий раздел в этом томе
  if (currentIndex > 0) {
    return volume.sections[currentIndex - 1];
  }

  // Последний раздел предыдущего тома
  const volumeIndex = tableOfContents.volumes.findIndex((v) => v.id === volume.id);
  if (volumeIndex > 0) {
    const prevVolume = tableOfContents.volumes[volumeIndex - 1];
    return prevVolume.sections[prevVolume.sections.length - 1] || null;
  }

  return null;
}
