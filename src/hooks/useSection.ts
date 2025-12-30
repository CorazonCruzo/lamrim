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
  '1-pamyatovanie-o-smerti': () => import('../content/volumes/volume-1/10-pamyatovanie-o-smerti.md?raw').then(m => m.default),
  '1-posle-smerti': () => import('../content/volumes/volume-1/11-posle-smerti.md?raw').then(m => m.default),
  '1-obrashhenie-k-pribezhishhu': () => import('../content/volumes/volume-1/12-obrashhenie-k-pribezhishhu.md?raw').then(m => m.default),
  '1-obshchie-razmyshleniya-o-zakone-karmy': () => import('../content/volumes/volume-1/13-obshchie-razmyshleniya-o-zakone-karmy.md?raw').then(m => m.default),
  '1-durnye-puti-karmy': () => import('../content/volumes/volume-1/14-durnye-puti-karmy.md?raw').then(m => m.default),
  '1-vybor-pravilnogo-povedeniya': () => import('../content/volumes/volume-1/15-vybor-pravilnogo-povedeniya.md?raw').then(m => m.default),
  '1-ochishchenie-chetyrmya-silami': () => import('../content/volumes/volume-1/16-ochishchenie-chetyrmya-silami.md?raw').then(m => m.default),
  '1-etap-sredney-lichnosti': () => import('../content/volumes/volume-1/17-etap-sredney-lichnosti.md?raw').then(m => m.default),
  '1-razmyshlenie-o-stradanii': () => import('../content/volumes/volume-1/18-razmyshlenie-o-stradanii.md?raw').then(m => m.default),
  '1-istina-istochnika': () => import('../content/volumes/volume-1/19-istina-istochnika.md?raw').then(m => m.default),
  '1-osnovy-puti-osvobozhdeniya': () => import('../content/volumes/volume-1/20-osnovy-puti-osvobozhdeniya.md?raw').then(m => m.default),
  '1-osobennosti-treh-praktik': () => import('../content/volumes/volume-1/21-osobennosti-treh-praktik.md?raw').then(m => m.default),
  '1-etap-vysshey-lichnosti': () => import('../content/volumes/volume-1/22-etap-vysshey-lichnosti.md?raw').then(m => m.default),
  '1-ustremlennost-k-probuzhdeniyu': () => import('../content/volumes/volume-1/23-ustremlennost-k-probuzhdeniyu.md?raw').then(m => m.default),
  '1-osnova-puti-mahayany-sostradanie': () => import('../content/volumes/volume-1/24-osnova-puti-mahayany-sostradanie.md?raw').then(m => m.default),
  '1-obretenie-ustremlennosti': () => import('../content/volumes/volume-1/25-obretenie-ustremlennosti.md?raw').then(m => m.default),
  '1-pochemu-nelzya-dostich-buddy': () => import('../content/volumes/volume-1/26-pochemu-nelzya-dostich-buddy.md?raw').then(m => m.default),
  '1-etapy-praktiki-bodhisattvy': () => import('../content/volumes/volume-1/27-etapy-praktiki-bodhisattvy.md?raw').then(m => m.default),
  '1-dayanie': () => import('../content/volumes/volume-1/28-dayanie.md?raw').then(m => m.default),
  '1-nravstvennost': () => import('../content/volumes/volume-1/29-nravstvennost.md?raw').then(m => m.default),
  '1-terpenie': () => import('../content/volumes/volume-1/30-terpenie.md?raw').then(m => m.default),
  '1-userdie': () => import('../content/volumes/volume-1/31-userdie.md?raw').then(m => m.default),
  '1-meditatsiya': () => import('../content/volumes/volume-1/32-meditatsiya.md?raw').then(m => m.default),
  '1-mudrost': () => import('../content/volumes/volume-1/33-mudrost.md?raw').then(m => m.default),

  // Volume 2
  '2-bezmyatezhnost-i-proniknovenie': () => import('../content/volumes/volume-2/01-bezmyatezhnost-i-proniknovenie.md?raw').then(m => m.default),
  '2-pravila-praktiki-bezmyatezhnosti': () => import('../content/volumes/volume-2/02-pravila-praktiki-bezmyatezhnosti.md?raw').then(m => m.default),
  '2-sposoby-prodvizheniya': () => import('../content/volumes/volume-2/03-sposoby-prodvizheniya.md?raw').then(m => m.default),
  '2-snaryazhenie-dlya-proniknoveniya': () => import('../content/volumes/volume-2/04-snaryazhenie-dlya-proniknoveniya.md?raw').then(m => m.default),
  '2-opredelenie-obekta-otritsaniya': () => import('../content/volumes/volume-2/05-opredelenie-obekta-otritsaniya.md?raw').then(m => m.default),
  '2-prasanga-ili-svatantra': () => import('../content/volumes/volume-2/06-prasanga-ili-svatantra.md?raw').then(m => m.default),
  '2-kak-razvit-vozzrenie': () => import('../content/volumes/volume-2/07-kak-razvit-vozzrenie.md?raw').then(m => m.default),
  '2-raznovidnosti-proniknoveniya': () => import('../content/volumes/volume-2/08-raznovidnosti-proniknoveniya.md?raw').then(m => m.default),
  '2-pravila-osvoeniya-proniknoveniya': () => import('../content/volumes/volume-2/09-pravila-osvoeniya-proniknoveniya.md?raw').then(m => m.default),
  '2-metod-sochetaniya': () => import('../content/volumes/volume-2/10-metod-sochetaniya.md?raw').then(m => m.default),
  '2-osobaya-praktika-vadzhrayany': () => import('../content/volumes/volume-2/11-osobaya-praktika-vadzhrayany.md?raw').then(m => m.default),
  '2-zavershenie': () => import('../content/volumes/volume-2/12-zavershenie.md?raw').then(m => m.default),
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
