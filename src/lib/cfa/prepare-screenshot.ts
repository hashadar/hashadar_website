import {
  planUpload,
  REENCODE_JPEG_QUALITY,
} from '@/lib/cfa/images';

export type PreparedScreenshot = {
  blob: Blob;
  contentType: 'image/png' | 'image/jpeg';
  extension: 'png' | 'jpg';
};

async function decode(file: Blob): Promise<{
  width: number;
  height: number;
  draw: (ctx: CanvasRenderingContext2D, width: number, height: number) => void;
  close: () => void;
}> {
  if (typeof createImageBitmap === 'function') {
    const bitmap = await createImageBitmap(file);
    return {
      width: bitmap.width,
      height: bitmap.height,
      draw: (ctx, width, height) => ctx.drawImage(bitmap, 0, 0, width, height),
      close: () => bitmap.close(),
    };
  }
  const url = URL.createObjectURL(file);
  const image = new Image();
  await new Promise<void>((resolve, reject) => {
    image.onload = () => resolve();
    image.onerror = () => reject(new Error('This image format is not supported.'));
    image.src = url;
  });
  return {
    width: image.naturalWidth,
    height: image.naturalHeight,
    draw: (ctx, width, height) => ctx.drawImage(image, 0, 0, width, height),
    close: () => URL.revokeObjectURL(url),
  };
}

/**
 * Browser-only: keep small PNG/JPEG screenshots as they are; scale down and
 * re-encode anything large or in another format (e.g. HEIC, WebP) as JPEG.
 */
export async function prepareScreenshot(file: File): Promise<PreparedScreenshot> {
  const image = await decode(file);
  try {
    const plan = planUpload({
      type: file.type,
      size: file.size,
      width: image.width,
      height: image.height,
    });
    if (plan.action === 'keep') {
      return { blob: file, contentType: plan.contentType, extension: plan.extension };
    }
    const canvas = document.createElement('canvas');
    canvas.width = plan.width;
    canvas.height = plan.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Could not prepare the screenshot.');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, plan.width, plan.height);
    image.draw(ctx, plan.width, plan.height);
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, 'image/jpeg', REENCODE_JPEG_QUALITY),
    );
    if (!blob) throw new Error('Could not prepare the screenshot.');
    return { blob, contentType: 'image/jpeg', extension: 'jpg' };
  } finally {
    image.close();
  }
}
