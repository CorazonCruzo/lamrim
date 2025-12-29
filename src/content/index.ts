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
          slug: 'vvedenie',
          order: 1,
        },
        {
          id: '1-02',
          volumeId: '1',
          title: 'Величие автора',
          slug: 'velichie-avtora',
          order: 2,
        },
        {
          id: '1-03',
          volumeId: '1',
          title: 'Величие Дхармы',
          slug: 'velichie-dharmy',
          order: 3,
        },
        {
          id: '1-04',
          volumeId: '1',
          title: 'Правила слушания и проповедования Дхармы',
          slug: 'pravila-slushaniya-i-propovedovaniya',
          order: 4,
        },
        {
          id: '1-05',
          volumeId: '1',
          title: 'Вверение себя благому другу',
          slug: 'vverenie-sebya-blagomu-drugu',
          order: 5,
        },
        {
          id: '1-06',
          volumeId: '1',
          title: 'Краткое изложение правил практики',
          slug: 'kratkoe-izlozhenie-pravil-praktiki',
          order: 6,
        },
        {
          id: '1-07',
          volumeId: '1',
          title: 'Упразднение ложных представлений об аналитическом созерцании',
          slug: 'uprazdnenie-lozhnyh-predstavleniy',
          order: 7,
        },
        {
          id: '1-08',
          volumeId: '1',
          title: 'Наделение смыслом благоприятного рождения',
          slug: 'nadelenie-smyslom-blagopriyatnogo-rozhdeniya',
          order: 8,
        },
        {
          id: '1-09',
          volumeId: '1',
          title: 'Этап духовного развития низшей личности',
          slug: 'etap-nizshey-lichnosti',
          order: 9,
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
