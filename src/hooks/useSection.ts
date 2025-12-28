import { useState, useEffect } from 'react';
import { getSectionById, getNextSection, getPrevSection } from '../content';
import type { Section, Volume } from '../types';

interface UseSectionResult {
  section: Section | null;
  volume: Volume | null;
  content: string | null;
  isLoading: boolean;
  error: string | null;
  nextSection: Section | null;
  prevSection: Section | null;
}

// Маппинг volumeId-slug -> файл
const contentFiles: Record<string, () => Promise<string>> = {
  // Volume 1
  '1-introduction': () => import('../content/volumes/volume-1/01-introduction.md?raw').then(m => m.default),
  '1-listening-dharma': () => import('../content/volumes/volume-1/02-listening-dharma.md?raw').then(m => m.default),
  '1-spiritual-teacher': () => import('../content/volumes/volume-1/03-spiritual-teacher.md?raw').then(m => m.default),
  // Volume 4
  '4-bezmyatezhnost-shamatkha-suschnost-meditatsii': () => import('../content/volumes/volume-4/07-bezmyatezhnost-shamatkha-suschnost-meditatsii.md?raw').then(m => m.default),
  '4-1-polza-osvoeniya-bezmyatezhnosti-i-proniknoveniya': () => import('../content/volumes/volume-4/08-1-polza-osvoeniya-bezmyatezhnosti-i-proniknoveniya.md?raw').then(m => m.default),
  '4-2-ukazanie-chto-bezmyatezhnost-i-proniknovenie': () => import('../content/volumes/volume-4/09-2-ukazanie-chto-bezmyatezhnost-i-proniknovenie.md?raw').then(m => m.default),
  '4-3-suschnost-bezmyatezhnosti-i-proniknoveniya': () => import('../content/volumes/volume-4/10-3-suschnost-bezmyatezhnosti-i-proniknoveniya.md?raw').then(m => m.default),
  '4-i-pravila-praktiki-bezmyatezhnosti': () => import('../content/volumes/volume-4/11-i-pravila-praktiki-bezmyatezhnosti.md?raw').then(m => m.default),
  '4-b-poryadok-sozertsaniya': () => import('../content/volumes/volume-4/12-b-poryadok-sozertsaniya.md?raw').then(m => m.default),
  '4-1-pravila-porozhdeniya-bezuprechnogo-samadkhi': () => import('../content/volumes/volume-4/13-1-pravila-porozhdeniya-bezuprechnogo-samadkhi.md?raw').then(m => m.default),
  '4-b-metod-osuschestvleniya-etikh-stepeney-s-pomoschy': () => import('../content/volumes/volume-4/14-b-metod-osuschestvleniya-etikh-stepeney-s-pomoschy.md?raw').then(m => m.default),
  '4-v-uchastie-chetyrekh-vidov-vnimaniya': () => import('../content/volumes/volume-4/15-v-uchastie-chetyrekh-vidov-vnimaniya.md?raw').then(m => m.default),
  '4-1-razgranichenie-dostizheniya-i-nedostizheniya-bez': () => import('../content/volumes/volume-4/16-1-razgranichenie-dostizheniya-i-nedostizheniya-bez.md?raw').then(m => m.default),
};

export function useSection(sectionId: string | undefined): UseSectionResult {
  const [content, setContent] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const result = sectionId ? getSectionById(sectionId) : null;
  const section = result?.section || null;
  const volume = result?.volume || null;
  const nextSection = sectionId ? getNextSection(sectionId) : null;
  const prevSection = sectionId ? getPrevSection(sectionId) : null;

  useEffect(() => {
    if (!section) {
      setIsLoading(false);
      setError('Раздел не найден');
      return;
    }

    setIsLoading(true);
    setError(null);

    const contentKey = `${section.volumeId}-${section.slug}`;
    const loadContent = contentFiles[contentKey];
    if (!loadContent) {
      setIsLoading(false);
      setError('Контент не найден');
      return;
    }

    loadContent()
      .then((text) => {
        setContent(text);
        setIsLoading(false);
      })
      .catch(() => {
        setError('Ошибка загрузки контента');
        setIsLoading(false);
      });
  }, [section?.volumeId, section?.slug]);

  return {
    section,
    volume,
    content,
    isLoading,
    error,
    nextSection,
    prevSection,
  };
}
