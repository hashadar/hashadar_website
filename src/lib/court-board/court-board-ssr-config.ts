/**
 * Non-secret Court Board SSR config available to Server Actions.
 * Amplify build overwrites these fields via write-amplify-ssr-env.ts
 * (`AWS_APP_ID`, region, and the table name from `amplify_outputs.json`).
 * The pepper is fetched at runtime from SSM (compute role) — not stored here.
 * See docs/court-board/infra.md.
 */
import 'server-only';

export type CourtBoardSsrConfig = {
  /** Amplify app id (SSM path prefix). */
  appId: string;
  /** AWS region for SSM and DynamoDB. */
  region: string;
  /** Court Board DynamoDB table name; null runs the in-memory dev store. */
  tableName: string | null;
};

/**
 * Local/CI defaults when write-amplify-ssr-env has not run.
 * Amplify build overwrites `appId` from `AWS_APP_ID`.
 */
export const courtBoardSsrConfig: CourtBoardSsrConfig = {
  appId: 'd3j7dgxx3prj17',
  region: 'eu-west-2',
  tableName: null,
};
