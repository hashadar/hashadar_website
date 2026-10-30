/**
 * Court Board club bootstrap, run by the Site Admin with AWS credentials:
 *
 *   npx tsx scripts/court-board-create-club.ts --name "Lunchtime Badminton" --venue "Sports hall"
 *     [--start 09:00] [--end 11:00] [--table NAME] [--region eu-west-2] [--origin https://...]
 *
 * Creates the Club and prints its Organiser link ONCE. Only the SHA-256 hash of
 * the token is stored, so the link cannot be shown again; rotate it from the
 * Organiser page if it is lost. See docs/court-board/infra.md.
 */
import { readFileSync } from 'node:fs';
import { randomBytes } from 'node:crypto';
import { pathToFileURL } from 'node:url';
import { createDynamoCourtBoardStore } from '../src/lib/court-board/dynamo-store';
import {
  generateOrganiserToken,
  hashOrganiserToken,
} from '../src/lib/court-board/organiser-token';
import { DEFAULT_CLUB_RULES } from '../src/lib/court-board/rules';
import type { Club, CourtBoardStore } from '../src/lib/court-board/store';
import { readCourtBoardTableNameFromOutputs } from './write-amplify-ssr-env';

const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;
const DEFAULT_REGION = 'eu-west-2';

export type CreateClubArgs = {
  name: string;
  venue: string;
  start: string;
  end: string;
  table: string | null;
  region: string | null;
  origin: string | null;
};

export const CREATE_CLUB_USAGE =
  'Usage: npx tsx scripts/court-board-create-club.ts --name "..." --venue "..." [--start 09:00] [--end 11:00] [--table NAME] [--region eu-west-2] [--origin URL]';

/** Parse `--flag value` pairs; throws a readable error on anything invalid. */
export function parseCreateClubArgs(argv: string[]): CreateClubArgs {
  const flags = new Map<string, string>();
  for (let i = 0; i < argv.length; i += 2) {
    const flag = argv[i];
    const value = argv[i + 1];
    if (!flag?.startsWith('--') || value === undefined || value.startsWith('--')) {
      throw new Error(`Invalid arguments near "${flag ?? ''}"\n${CREATE_CLUB_USAGE}`);
    }
    flags.set(flag.slice(2), value.trim());
  }

  const known = ['name', 'venue', 'start', 'end', 'table', 'region', 'origin'];
  for (const flag of flags.keys()) {
    if (!known.includes(flag)) {
      throw new Error(`Unknown option --${flag}\n${CREATE_CLUB_USAGE}`);
    }
  }

  const name = flags.get('name');
  const venue = flags.get('venue');
  if (!name) throw new Error(`--name is required\n${CREATE_CLUB_USAGE}`);
  if (!venue) throw new Error(`--venue is required\n${CREATE_CLUB_USAGE}`);
  if (name.length > 60) throw new Error('--name must be 60 characters or fewer');
  if (venue.length > 80) throw new Error('--venue must be 80 characters or fewer');

  const start = flags.get('start') ?? '09:00';
  const end = flags.get('end') ?? '11:00';
  if (!TIME.test(start)) throw new Error('--start must be HH:mm (24-hour)');
  if (!TIME.test(end)) throw new Error('--end must be HH:mm (24-hour)');

  return {
    name,
    venue,
    start,
    end,
    table: flags.get('table') || null,
    region: flags.get('region') || null,
    origin: flags.get('origin') || null,
  };
}

/** 12-character URL-safe id. */
export function generateClubId(): string {
  return randomBytes(9).toString('base64url');
}

export function buildClub(args: CreateClubArgs, id: string, now: Date): Club {
  return {
    id,
    name: args.name,
    venue: args.venue,
    startTime: args.start,
    endTime: args.end,
    rules: DEFAULT_CLUB_RULES,
    createdAt: now,
  };
}

export function organiserLink(origin: string, token: string): string {
  return `${origin.replace(/\/+$/, '')}/labs/court-board/o/${token}`;
}

export type CreateClubDeps = {
  store: Pick<CourtBoardStore, 'createClub'>;
  origin: string;
  now?: () => Date;
  newClubId?: () => string;
  newToken?: () => string;
};

/** Create the Club and return the one-time Organiser link. */
export async function createClub(
  args: CreateClubArgs,
  deps: CreateClubDeps,
): Promise<{ clubId: string; link: string }> {
  const clubId = (deps.newClubId ?? generateClubId)();
  const token = (deps.newToken ?? generateOrganiserToken)();
  const club = buildClub(args, clubId, (deps.now ?? (() => new Date()))());
  await deps.store.createClub(club, hashOrganiserToken(token));
  return { clubId, link: organiserLink(deps.origin, token) };
}

function readSiteUrl(): string {
  const site = JSON.parse(
    readFileSync('src/data/common/site.json', 'utf8'),
  ) as { metadata: { siteUrl: string } };
  return site.metadata.siteUrl;
}

export function resolveTableName(
  args: CreateClubArgs,
  env: Record<string, string | undefined> = process.env,
): string | null {
  return (
    args.table ||
    env.COURT_BOARD_TABLE?.trim() ||
    readCourtBoardTableNameFromOutputs()
  );
}

async function main(): Promise<void> {
  const args = parseCreateClubArgs(process.argv.slice(2));
  const tableName = resolveTableName(args);
  if (!tableName) {
    throw new Error(
      'No table name: pass --table, set COURT_BOARD_TABLE, or generate amplify_outputs.json',
    );
  }

  const store = createDynamoCourtBoardStore({
    tableName,
    region:
      args.region ??
      process.env.AWS_REGION?.trim() ??
      process.env.AWS_DEFAULT_REGION?.trim() ??
      DEFAULT_REGION,
  });
  const { clubId, link } = await createClub(args, {
    store,
    origin: args.origin ?? readSiteUrl(),
  });

  console.log(`Created club "${args.name}" (${clubId}) in table ${tableName}.`);
  console.log('');
  console.log('Organiser link (shown ONCE; only its hash is stored):');
  console.log(`  ${link}`);
  console.log('');
  console.log(
    'Give it to the committee privately. Anyone holding it can run the club. If it is lost, rotate it from the Organiser page.',
  );
}

const isMain =
  process.argv[1] !== undefined &&
  import.meta.url === pathToFileURL(process.argv[1]).href;

if (isMain) {
  main().catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  });
}
