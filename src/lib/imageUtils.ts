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
 * Resizes/compresses an image client-side before upload, so a raw phone photo
 * doesn't bloat the Dataverse row or the outgoing email (ceiling: ~1MB inline image).
 *
 * iPhones save camera photos as HEIC/HEIF by default, which <img>/canvas can't decode
 * in Chromium-based browsers (only Safari supports it natively) — that silent decode
 * failure was surfacing as "could not process that image". heic2any transcodes to JPEG
 * first so the rest of the pipeline (canvas resize/compress) works the same as any photo.
 *
 * Loads the source through a data: URI (FileReader) rather than a blob: object URL —
 * this app runs inside a sandboxed third-party iframe (the Power Apps host), and both
 * Safari (ITP) and Brave (Shields) were found to block blob: URLs in that context,
 * making every upload fail with an onerror regardless of file type. data: URIs aren't
 * subject to that restriction.
 */
export async function compressImage(file: File, maxWidth = 800, quality = 0.7): Promise<CompressedImage> {
  let source: Blob = file;
  if (isHeic(file)) {
    const heic2any = (await import('heic2any')).default;
    const converted = await heic2any({ blob: file, toType: 'image/jpeg', quality });
    source = Array.isArray(converted) ? converted[0] : converted;
  }

  const sourceDataUrl = await readAsDataUrl(source);

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
      const dataUrl = canvas.toDataURL('image/jpeg', quality);
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            reject(new Error('Image compression failed'));
            return;
          }
          resolve({ file: new File([blob], file.name.replace(/\.\w+$/, '.jpg'), { type: 'image/jpeg' }), dataUrl });
        },
        'image/jpeg',
        quality
      );
    };
    img.onerror = () => {
      reject(new Error(`Could not decode "${file.name}" — try a JPG or PNG.`));
    };
    img.src = sourceDataUrl;
  });
}
