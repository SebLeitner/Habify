export type CompressImageOptions = {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
};

const loadImageFromDataUrl = (dataUrl: string): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('Bild konnte nicht geladen werden.'));
    image.src = dataUrl;
  });

export const compressImageFile = async (
  file: File,
  { maxWidth = 1600, maxHeight = 1600, quality = 0.85 }: CompressImageOptions = {},
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

  const image = await loadImageFromDataUrl(originalDataUrl);
  const scale = Math.min(maxWidth / image.naturalWidth, maxHeight / image.naturalHeight, 1);

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

  const compressedDataUrl = canvas.toDataURL('image/jpeg', quality);

  return { dataUrl: compressedDataUrl, name: file.name };
};
