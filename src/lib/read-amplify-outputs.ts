import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import type { AmplifyOutputs } from './configure-site-amplify';

const OUTPUTS_PATH = path.join(process.cwd(), 'amplify_outputs.json');

/** Reads generated Amplify outputs when present; returns null for CI / marketing-only builds. */
export function readAmplifyOutputs(
  filePath: string = OUTPUTS_PATH,
): AmplifyOutputs | null {
  if (!existsSync(filePath)) {
    return null;
  }

  try {
    const parsed = JSON.parse(readFileSync(filePath, 'utf8')) as unknown;
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return null;
    }
    return parsed as AmplifyOutputs;
  } catch {
    return null;
  }
}
