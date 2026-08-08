/** Amplify Storage bucket name from defineStorage({ name: 'wmwSnapshots' }). */
export const WMW_SNAPSHOTS_BUCKET = 'wmwSnapshots';

/** Last-good Snapshot JSON under the private WMW bucket. */
export const WMW_LAST_GOOD_SNAPSHOT_KEY = 'snapshots/last-good.json';

/** As-of metadata for the last-good Snapshot. */
export const WMW_LAST_GOOD_META_KEY = 'snapshots/last-good.meta.json';

export type WmwSnapshotMeta = {
  /** ISO-8601 timestamp when the Snapshot was taken from the Workbook. */
  asOf: string;
};
