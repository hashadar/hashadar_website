export type AmplifyOutputs = Record<string, unknown>;

export type AmplifyConfigure = (
  outputs: AmplifyOutputs,
  options?: { ssr?: boolean },
) => void;

function hasOutputs(outputs?: AmplifyOutputs | null): outputs is AmplifyOutputs {
  return outputs != null && Object.keys(outputs).length > 0;
}

export function configureSiteAmplify(
  outputs?: AmplifyOutputs | null,
  configure?: AmplifyConfigure,
): void {
  if (!hasOutputs(outputs) || !configure) {
    return;
  }

  configure(outputs, { ssr: true });
}
