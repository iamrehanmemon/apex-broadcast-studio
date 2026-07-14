/** Gold-on-charcoal placeholder shown before an author uploads a real photo, so the preview never looks unfinished. */
export function placeholderImage(label: string): string {
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='640' height='300'>
    <rect width='640' height='300' fill='#202020'/>
    <rect x='0' y='0' width='640' height='300' fill='none' stroke='#ffc000' stroke-width='2'/>
    <text x='320' y='158' fill='#ffc000' font-family='Arial' font-size='22' font-weight='700' text-anchor='middle' letter-spacing='2'>${label.toUpperCase()}</text>
    <text x='320' y='186' fill='#7d7d7d' font-family='Arial' font-size='13' text-anchor='middle'>Click to upload</text>
  </svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

export interface CompressedImage {
  file: File;
  /** data: URI — safe to embed in iframe srcDoc and in the final emailed HTML (blob: URLs resolve in neither). */
  dataUrl: string;
}

export interface CropPixels {
  x: number;
  y: number;
  width: number;
  height: number;
}

function isHeic(file: File): boolean {
  const name = file.name.toLowerCase();
  return file.type === 'image/heic' || file.type === 'image/heif' || name.endsWith('.heic') || name.endsWith('.heif');
}

function readAsDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error('Could not read the selected file.'));
    reader.readAsDataURL(blob);
  });
}

/**
 * Decodes a picked file into a plain data: URI, ready to feed into an <img> or a cropper —
 * doesn't resize/compress yet, just handles format conversion.
 *
 * iPhones save camera photos as HEIC/HEIF by default, which <img>/canvas can't decode
 * in Chromium-based browsers (only Safari supports it natively) — that silent decode
 * failure was surfacing as "could not process that image". heic2any transcodes to JPEG
 * first so the rest of the pipeline works the same as any photo.
 *
 * Returns a data: URI rather than a blob: object URL — this app runs inside a sandboxed
 * third-party iframe (the Power Apps host), and both Safari (ITP) and Brave (Shields) were
 * found to block blob: URLs in that context, making every upload fail regardless of file
 * type. data: URIs aren't subject to that restriction.
 */
export async function decodeImageToDataUrl(file: File): Promise<string> {
  let source: Blob = file;
  if (isHeic(file)) {
    const heic2any = (await import('heic2any')).default;
    const converted = await heic2any({ blob: file, toType: 'image/jpeg', quality: 0.9 });
    source = Array.isArray(converted) ? converted[0] : converted;
  }
  return readAsDataUrl(source);
}

/** Resizes/compresses an already-decoded image (no cropping) — used where a user-adjustable crop isn't offered. */
export function compressImage(dataUrl: string, maxWidth = 800, quality = 0.7): Promise<CompressedImage> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, maxWidth / img.width);
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Canvas not supported'));
        return;
      }
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      finishCanvas(canvas, quality).then(resolve, reject);
    };
    img.onerror = () => reject(new Error('Could not decode that image — try a JPG or PNG.'));
    img.src = dataUrl;
  });
}

/** Draws the user-selected crop region (in source-image pixel coordinates, from react-easy-crop's onCropComplete) onto a canvas at the target output size. */
export function getCroppedImage(
  sourceDataUrl: string,
  crop: CropPixels,
  outputWidth: number,
  outputHeight: number,
  quality = 0.75
): Promise<CompressedImage> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = outputWidth;
      canvas.height = outputHeight;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Canvas not supported'));
        return;
      }
      ctx.drawImage(img, crop.x, crop.y, crop.width, crop.height, 0, 0, outputWidth, outputHeight);
      finishCanvas(canvas, quality).then(resolve, reject);
    };
    img.onerror = () => reject(new Error('Could not crop that image.'));
    img.src = sourceDataUrl;
  });
}

function finishCanvas(canvas: HTMLCanvasElement, quality: number): Promise<CompressedImage> {
  return new Promise((resolve, reject) => {
    const dataUrl = canvas.toDataURL('image/jpeg', quality);
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error('Image processing failed'));
          return;
        }
        resolve({ file: new File([blob], 'photo.jpg', { type: 'image/jpeg' }), dataUrl });
      },
      'image/jpeg',
      quality
    );
  });
}
