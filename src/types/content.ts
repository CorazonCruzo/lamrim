export interface Volume {
  id: string;
  title: string;
  description?: string;
  sections: Section[];
}

export interface Section {
  id: string;
  volumeId: string;
  title: string;
  slug: string;
  order: number;
  content?: string;
}

export interface TableOfContents {
  volumes: Volume[];
}
