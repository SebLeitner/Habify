const PDF_LINE_HEIGHT = 16;
const PDF_MARGIN = 50;

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

export const buildPdfPages = (lines: string[]) => {
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
  return `BT\n/F1 12 Tf\n${PDF_MARGIN} ${842 - PDF_MARGIN} Td\n${PDF_LINE_HEIGHT} TL\n${streamBody}\nET`;
};

const generatePdf = (pages: string[][]) => {
  const objects: string[] = [];
  const addObject = (content: string) => {
    objects.push(content);
    return objects.length; // object id
  };

  const fontId = addObject('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>');
  const contentIds = pages.map((pageLines) => {
    const stream = createPdfContentStream(pageLines);
    const length = stream.length;
    return addObject(`<< /Length ${length} >>\nstream\n${stream}\nendstream`);
  });

  const pagesId = addObject(''); // placeholder

  const pageIds = pages.map((_, index) => {
    const pageObj = `<< /Type /Page /Parent ${pagesId} 0 R /MediaBox [0 0 595 842] /Contents ${
      contentIds[index]
    } 0 R /Resources << /Font << /F1 ${fontId} 0 R >> >> >>`;
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

export const downloadPdf = (filename: string, pages: string[][]) => {
  const pdfString = generatePdf(pages);
  const blob = new Blob([pdfString], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

