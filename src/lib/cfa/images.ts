/**
 * Screenshot upload plan. Bedrock accepts PNG/JPEG up to a few MB per image,
 * so large or unusual files are re-encoded in the browser before upload.
 */

export const MAX_SCREENSHOTS_PER_CAPTURE = 5;
/** Longest edge kept as-is; larger images are scaled down. */
export const MAX_IMAGE_EDGE = 2400;
/** Bedrock's per-image limit is 3.75 MB; keep a margin. */
export const MAX_IMAGE_BYTES = 3_500_000;
export const REENCODE_JPEG_QUALITY = 0.9;

export type ImageInfo = {
  type: string;
  size: number;
  width: number;
  height: number;
};

export type UploadPlan =
  | { action: 'keep'; contentType: 'image/png' | 'image/jpeg'; extension: 'png' | 'jpg' }
  | { action: 'reencode'; width: number; height: number };

export function scaledSize(
  width: number,
  height: number,
  maxEdge: number = MAX_IMAGE_EDGE,
): { width: number; height: number } {
  const longest = Math.max(width, height);
  if (longest <= maxEdge || longest === 0) return { width, height };
  const scale = maxEdge / longest;
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
}

export function planUpload(info: ImageInfo): UploadPlan {
  const type = info.type.toLowerCase();
  const fits =
    info.size <= MAX_IMAGE_BYTES &&
    Math.max(info.width, info.height) <= MAX_IMAGE_EDGE;
  if (fits && type === 'image/png') {
    return { action: 'keep', contentType: 'image/png', extension: 'png' };
  }
  if (fits && (type === 'image/jpeg' || type === 'image/jpg')) {
    return { action: 'keep', contentType: 'image/jpeg', extension: 'jpg' };
  }
  return { action: 'reencode', ...scaledSize(info.width, info.height) };
}

/** Image files from a paste or drop (ignores text and other kinds). */
export function imageFilesFrom(items: ArrayLike<{ kind: string; type: string; getAsFile: () => File | null }>): File[] {
  const files: File[] = [];
  for (let i = 0; i < items.length; i += 1) {
    const item = items[i];
    if (item.kind === 'file' && item.type.startsWith('image/')) {
      const file = item.getAsFile();
      if (file) files.push(file);
    }
  }
  return files;
}
