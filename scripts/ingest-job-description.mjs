/**
 * Upload a job-description markdown file to the lab raw/ corpus prefix.
 *
 * Requires amplify_outputs.json (from `npm run sandbox` or Hosting) and AWS
 * credentials that can PutObject to the storage bucket. The S3 ObjectCreated
 * trigger upserts JobDescription metadata; recompute is not started.
 *
 * Usage: node scripts/ingest-job-description.mjs <path-to.md> [optional-object-name.md]
 */
import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const outputsPath = path.join(root, 'amplify_outputs.json');

const filePath = process.argv[2];
const objectName = process.argv[3];

if (!filePath) {
  console.error(
    'Usage: node scripts/ingest-job-description.mjs <path-to.md> [optional-object-name.md]',
  );
  process.exit(1);
}

if (!existsSync(outputsPath)) {
  console.error(
    'amplify_outputs.json not found. Run `npm run sandbox` (or deploy) first.',
  );
  process.exit(1);
}

const outputs = JSON.parse(readFileSync(outputsPath, 'utf8'));
const bucketName = outputs.storage?.bucket_name;
const region = outputs.storage?.aws_region;

if (!bucketName || !region) {
  console.error(
    'amplify_outputs.json is missing storage.bucket_name / storage.aws_region.',
  );
  process.exit(1);
}

const absolutePath = path.resolve(filePath);
if (!existsSync(absolutePath)) {
  console.error(`File not found: ${absolutePath}`);
  process.exit(1);
}

const body = readFileSync(absolutePath);
const keyName = objectName ?? path.basename(absolutePath);
if (!keyName.toLowerCase().endsWith('.md')) {
  console.error('Object name must end with .md');
  process.exit(1);
}

const key = `raw/${keyName}`;
const client = new S3Client({ region });

await client.send(
  new PutObjectCommand({
    Bucket: bucketName,
    Key: key,
    Body: body,
    ContentType: 'text/markdown; charset=utf-8',
  }),
);

console.log(`Uploaded s3://${bucketName}/${key}`);
console.log(
  'Ingest Lambda will upsert JobDescription metadata if frontmatter is valid.',
);
