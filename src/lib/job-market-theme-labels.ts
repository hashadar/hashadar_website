export type ThemeLabelOverrideRecord = {
  clusterKey: string;
  label: string;
};

export type ListThemeLabelOverridesDeps = {
  listOverrides?: () => Promise<ThemeLabelOverrideRecord[]>;
};

export type SetThemeLabelOverrideDeps = {
  saveOverride?: (record: ThemeLabelOverrideRecord) => Promise<void>;
};

export async function listThemeLabelOverrides(
  deps: ListThemeLabelOverridesDeps = {},
): Promise<ThemeLabelOverrideRecord[]> {
  if (!deps.listOverrides) {
    return [];
  }
  return deps.listOverrides();
}

export async function setThemeLabelOverride(
  clusterKey: string,
  label: string,
  deps: SetThemeLabelOverrideDeps = {},
): Promise<void> {
  const trimmed = label.trim();
  if (!trimmed) {
    throw new Error('Theme label override cannot be empty');
  }

  if (!deps.saveOverride) {
    throw new Error('Theme label overrides are not configured');
  }

  await deps.saveOverride({
    clusterKey,
    label: trimmed,
  });
}
