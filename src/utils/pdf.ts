const PDF_LINE_HEIGHT = 16;
const PDF_MARGIN = 50;
const PAGE_WIDTH = 595;
const PAGE_HEIGHT = 842;

type RgbColor = [number, number, number];

export type PdfImage = {
  name?: string;
  width: number;
  height: number;
  data: Uint8Array;
};

type PdfPageContent = { contentStream: string; images?: PdfImage[] };

export type PdfPage = string[] | PdfPageContent;

export const wrapText = (text: string, maxChars = 90) => {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let currentLine = '';

  words.forEach((word) => {
    if ((currentLine + word).length <= maxChars) {
      currentLine = currentLine ? `${currentLine} ${word}` : word;
    } else {
      if (currentLine) {
        lines.push(currentLine);
      }
      currentLine = word;
    }
  });

  if (currentLine) {
    lines.push(currentLine);
  }

  return lines;
};

const escapePdfText = (text: string) => {
  return Array.from(text)
    .map((char) => {
      if (char === '\\') return '\\\\';
      if (char === '(') return '\\(';
      if (char === ')') return '\\)';
      if (char === '\n' || char === '\r') return ' ';
      if (char.charCodeAt(0) > 0xff) return '?';
      return char;
    })
    .join('');
};

const bytesToBinaryString = (data: Uint8Array) => {
  let result = '';
  data.forEach((byte) => {
    result += String.fromCharCode(byte);
  });
  return result;
};

const buildTextCommand = (text: string, fontSize: number, x: number, y: number, color: RgbColor = [0, 0, 0]) => {
  const escaped = escapePdfText(text);
  return [
    'BT',
    `${color[0]} ${color[1]} ${color[2]} rg`,
    `/F1 ${fontSize} Tf`,
    `${x.toFixed(2)} ${y.toFixed(2)} Td`,
    `(${escaped}) Tj`,
    'ET',
  ].join('\n');
};

export const buildPdfPages = (lines: string[]): PdfPage[] => {
  const maxLinesPerPage = Math.floor((842 - PDF_MARGIN * 2) / PDF_LINE_HEIGHT) - 1;
  const pages: string[][] = [];
  let current: string[] = [];

  lines.forEach((line) => {
    if (current.length >= maxLinesPerPage) {
      pages.push(current);
      current = [];
    }
    current.push(line);
  });

  if (current.length) {
    pages.push(current);
  }

  return pages;
};

const createPdfContentStream = (lines: string[]) => {
  const escapedLines = lines.map((line) => escapePdfText(line));
  const streamBody = escapedLines
    .map((line, index) => `${index === 0 ? '' : 'T* '}${line ? `(${line}) Tj` : '() Tj'}`)
    .join('\n');
  return `BT\n/F1 12 Tf\n${PDF_MARGIN} ${PAGE_HEIGHT - PDF_MARGIN} Td\n${PDF_LINE_HEIGHT} TL\n${streamBody}\nET`;
};

const estimateTextWidth = (text: string, fontSize: number) => text.length * fontSize * 0.5;

const buildCenteredText = (text: string, fontSize: number, y: number, color: RgbColor = [0, 0, 0]) => {
  const escaped = escapePdfText(text);
  const x = Math.max(PDF_MARGIN, (PAGE_WIDTH - estimateTextWidth(text, fontSize)) / 2);

  return [
    'BT',
    `${color[0]} ${color[1]} ${color[2]} rg`,
    `/F1 ${fontSize} Tf`,
    `${x.toFixed(2)} ${y.toFixed(2)} Td`,
    `(${escaped}) Tj`,
    'ET',
  ].join('\n');
};

export const createCoverPage = (options: {
  title: string;
  note: string;
  period: string;
  summary: string;
}) => {
  const centerY = PAGE_HEIGHT / 2;

  const contentStream = [
    buildCenteredText(options.title, 28, centerY + 60),
    buildCenteredText(options.note, 16, centerY + 28, [1, 0, 0]),
    buildCenteredText(options.period, 14, centerY - 6),
    buildCenteredText(options.summary, 14, centerY - 34),
  ].join('\n');

  return { contentStream } satisfies PdfPage;
};

export type PdfLayoutBlock =
  | { type: 'text'; text: string; fontSize?: number; color?: RgbColor; marginBottom?: number; lineHeight?: number }
  | { type: 'image'; image: PdfImage; marginBottom?: number };

export const buildMixedPdfPages = (blocks: PdfLayoutBlock[], margin = PDF_MARGIN): PdfPage[] => {
  if (!blocks.length) {
    return [];
  }

  const pages: PdfPageContent[] = [];
  let cursorY = PAGE_HEIGHT - margin;
  let commands: string[] = [];
  let images: PdfImage[] = [];

  const flushPage = () => {
    if (!commands.length && !images.length) return;
    pages.push({ contentStream: commands.join('\n'), images });
    cursorY = PAGE_HEIGHT - margin;
    commands = [];
    images = [];
  };

  blocks.forEach((block) => {
    const blockHeight = block.type === 'text' ? block.lineHeight ?? PDF_LINE_HEIGHT : block.image.height;
    const marginBottom = block.marginBottom ?? 6;

    if (cursorY - blockHeight < margin) {
      flushPage();
    }

    if (block.type === 'text') {
      const fontSize = block.fontSize ?? 12;
      const lineHeight = block.lineHeight ?? PDF_LINE_HEIGHT;
      const y = cursorY - lineHeight + lineHeight - fontSize + 4;
      commands.push(buildTextCommand(block.text, fontSize, PDF_MARGIN, y, block.color ?? [0, 0, 0]));
    } else {
      const imageName = block.image.name ?? `Im${images.length + 1}`;
      const x = Math.max(margin, (PAGE_WIDTH - block.image.width) / 2);
      const y = cursorY - block.image.height;
      commands.push(
        `q\n${block.image.width.toFixed(2)} 0 0 ${block.image.height.toFixed(2)} ${x.toFixed(2)} ${y.toFixed(2)} cm\n/${imageName} Do\nQ`,
      );
      images.push({ ...block.image, name: imageName });
    }

    cursorY -= blockHeight + marginBottom;
  });

  flushPage();

  return pages;
};

const generatePdf = (pages: PdfPage[]) => {
  const objects: string[] = [];
  const addObject = (content: string) => {
    objects.push(content);
    return objects.length; // object id
  };

  const fontId = addObject('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>');
  const contentIds: number[] = [];
  const xObjectsPerPage: { name: string; objectId: number }[][] = [];

  pages.forEach((pageLines) => {
    const images = Array.isArray(pageLines) ? [] : pageLines.images ?? [];
    const xObjects = images.map((image, index) => {
      const name = image.name ?? `Im${index + 1}`;
      const binary = bytesToBinaryString(image.data);
      const objectId = addObject(
        `<< /Type /XObject /Subtype /Image /Width ${image.width} /Height ${image.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${image.data.length} >>\nstream\n${binary}\nendstream`,
      );
      return { name, objectId };
    });
    xObjectsPerPage.push(xObjects);

    const stream = Array.isArray(pageLines) ? createPdfContentStream(pageLines) : pageLines.contentStream;
    const length = stream.length;
    contentIds.push(addObject(`<< /Length ${length} >>\nstream\n${stream}\nendstream`));
  });

  const pagesId = addObject(''); // placeholder

  const pageIds = pages.map((_, index) => {
    const xObjects = xObjectsPerPage[index];
    const xObjectEntry =
      xObjects.length > 0
        ? `/XObject << ${xObjects.map((item) => `/${item.name} ${item.objectId} 0 R`).join(' ')} >>`
        : '';
    const resources = `/Resources << /Font << /F1 ${fontId} 0 R >>${xObjectEntry ? ` ${xObjectEntry}` : ''} >>`;
    const pageObj = `<< /Type /Page /Parent ${pagesId} 0 R /MediaBox [0 0 595 842] /Contents ${contentIds[index]} 0 R ${resources} >>`;
    return addObject(pageObj);
  });

  objects[pagesId - 1] = `<< /Type /Pages /Kids [${pageIds
    .map((id) => `${id} 0 R`)
    .join(' ')}] /Count ${pageIds.length} >>`;

  const catalogId = addObject(`<< /Type /Catalog /Pages ${pagesId} 0 R >>`);

  let pdf = '%PDF-1.4\n';
  const offsets: number[] = [0];

  objects.forEach((object, index) => {
    offsets.push(pdf.length);
    pdf += `${index + 1} 0 obj\n${object}\nendobj\n`;
  });

  const xrefStart = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n`;
  pdf += '0000000000 65535 f \n';
  offsets.slice(1).forEach((offset) => {
    pdf += `${offset.toString().padStart(10, '0')} 00000 n \n`;
  });
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root ${catalogId} 0 R >>\nstartxref\n${xrefStart}\n%%EOF`;

  return pdf;
};

export const downloadPdf = (filename: string, pages: PdfPage[]) => {
  const pdfString = generatePdf(pages);
  const bytes = new Uint8Array(pdfString.length);
  for (let index = 0; index < pdfString.length; index += 1) {
    bytes[index] = pdfString.charCodeAt(index) & 0xff;
  }

  const blob = new Blob([bytes], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

