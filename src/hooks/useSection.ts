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

// Маппинг slug -> файл
const contentFiles: Record<string, () => Promise<string>> = {
  'introduction': () => import('../content/volumes/volume-1/01-introduction.md?raw').then(m => m.default),
  'listening-dharma': () => import('../content/volumes/volume-1/02-listening-dharma.md?raw').then(m => m.default),
  'spiritual-teacher': () => import('../content/volumes/volume-1/03-spiritual-teacher.md?raw').then(m => m.default),
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

    const loadContent = contentFiles[section.slug];
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
  }, [section?.slug]);

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
