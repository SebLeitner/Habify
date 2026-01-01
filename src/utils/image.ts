export type CompressImageOptions = {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
  maxSizeBytes?: number;
  minQuality?: number;
  resizeStep?: number;
};

const loadImageFromDataUrl = (dataUrl: string): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('Bild konnte nicht geladen werden.'));
    image.src = dataUrl;
  });

export const estimateDataUrlSize = (dataUrl: string) => {
  const base64 = dataUrl.split(',')[1];
  if (!base64) return 0;
  const padding = (base64.match(/=*$/)?.[0].length ?? 0);
  return (base64.length * 3) / 4 - padding;
};

export const compressImageFile = async (
  file: File,
  {
    maxWidth = 1600,
    maxHeight = 1600,
    quality = 0.85,
    maxSizeBytes,
    minQuality = 0.5,
    resizeStep = 0.9,
  }: CompressImageOptions = {},
): Promise<{ dataUrl: string; name: string }> => {
  const reader = new FileReader();

  const originalDataUrl = await new Promise<string>((resolve, reject) => {
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result as string);
      } else {
        reject(new Error('Bild konnte nicht gelesen werden.'));
      }
    };
    reader.onerror = () => reject(new Error('Bild konnte nicht gelesen werden.'));
    reader.readAsDataURL(file);
  });

  let currentMaxWidth = maxWidth;
  let currentMaxHeight = maxHeight;
  let currentQuality = quality;

  const compressWithSettings = async () => {
    const image = await loadImageFromDataUrl(originalDataUrl);
    const scale = Math.min(currentMaxWidth / image.naturalWidth, currentMaxHeight / image.naturalHeight, 1);

    const targetWidth = Math.max(1, Math.round(image.naturalWidth * scale));
    const targetHeight = Math.max(1, Math.round(image.naturalHeight * scale));

    const canvas = document.createElement('canvas');
    canvas.width = targetWidth;
    canvas.height = targetHeight;

    const context = canvas.getContext('2d');
    if (!context) {
      throw new Error('Foto konnte nicht verarbeitet werden.');
    }

    context.drawImage(image, 0, 0, targetWidth, targetHeight);

    return canvas.toDataURL('image/jpeg', currentQuality);
  };

  let compressedDataUrl = await compressWithSettings();

  if (!maxSizeBytes) {
    return { dataUrl: compressedDataUrl, name: file.name };
  }

  const maxAttempts = 10;
  let attempts = 0;
  let estimatedSize = estimateDataUrlSize(compressedDataUrl);

  while (estimatedSize > maxSizeBytes && attempts < maxAttempts) {
    if (currentQuality > minQuality) {
      currentQuality = Math.max(minQuality, currentQuality - 0.1);
    } else {
      currentMaxWidth = Math.max(300, Math.round(currentMaxWidth * resizeStep));
      currentMaxHeight = Math.max(300, Math.round(currentMaxHeight * resizeStep));
    }

    compressedDataUrl = await compressWithSettings();
    estimatedSize = estimateDataUrlSize(compressedDataUrl);
    attempts += 1;
  }

  if (estimatedSize > maxSizeBytes) {
    throw new Error('Foto konnte nicht verarbeitet werden.');
  }

  return { dataUrl: compressedDataUrl, name: file.name };
};
