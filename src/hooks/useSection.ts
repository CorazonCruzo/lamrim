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
  '1-vvedenie': () => import('../content/volumes/volume-1/01-vvedenie.md?raw').then(m => m.default),
  '1-velichie-avtora': () => import('../content/volumes/volume-1/02-velichie-avtora.md?raw').then(m => m.default),
  '1-velichie-dharmy': () => import('../content/volumes/volume-1/03-velichie-dharmy.md?raw').then(m => m.default),
  '1-pravila-slushaniya-i-propovedovaniya': () => import('../content/volumes/volume-1/04-pravila-slushaniya-i-propovedovaniya.md?raw').then(m => m.default),
  '1-vverenie-sebya-blagomu-drugu': () => import('../content/volumes/volume-1/05-vverenie-sebya-blagomu-drugu.md?raw').then(m => m.default),
  '1-kratkoe-izlozhenie-pravil-praktiki': () => import('../content/volumes/volume-1/06-kratkoe-izlozhenie-pravil-praktiki.md?raw').then(m => m.default),
  '1-uprazdnenie-lozhnyh-predstavleniy': () => import('../content/volumes/volume-1/07-uprazdnenie-lozhnyh-predstavleniy.md?raw').then(m => m.default),
  '1-nadelenie-smyslom-blagopriyatnogo-rozhdeniya': () => import('../content/volumes/volume-1/08-nadelenie-smyslom-blagopriyatnogo-rozhdeniya.md?raw').then(m => m.default),
  '1-etap-nizshey-lichnosti': () => import('../content/volumes/volume-1/09-etap-nizshey-lichnosti.md?raw').then(m => m.default),
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
