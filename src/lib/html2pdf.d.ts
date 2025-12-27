declare module 'html2pdf.js' {
  interface Html2PdfOptions {
    margin?: number | number[];
    filename?: string;
    image?: { type?: string; quality?: number };
    html2canvas?: {
      scale?: number;
      useCORS?: boolean;
      logging?: boolean;
      onclone?: (clonedDoc: Document) => void;
      x?: number;
      y?: number;
      scrollX?: number;
      scrollY?: number;
      windowWidth?: number;
      windowHeight?: number;
    };
    jsPDF?: { unit?: string; format?: string; orientation?: string };
    pagebreak?: { mode?: string | string[] };
  }

  interface Html2Pdf {
    set(options: Html2PdfOptions): Html2Pdf;
    from(element: HTMLElement | string): Html2Pdf;
    save(): Promise<void>;
    output(type: string): Promise<unknown>;
    then(callback: (pdf: unknown) => void): Html2Pdf;
  }

  function html2pdf(): Html2Pdf;
  export default html2pdf;
}
