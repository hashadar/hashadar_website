import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

describe('amplify.yml Hosting blog-sync contract', () => {
  const amplifyYml = readFileSync(
    path.join(process.cwd(), 'amplify.yml'),
    'utf8',
  );

  it('keeps private blog clone and sync in Amplify preBuild', () => {
    expect(amplifyYml).toMatch(/SSH_PRIVATE_KEY/);
    expect(amplifyYml).toMatch(/BLOG_REPO_URL/);
    expect(amplifyYml).toMatch(/sync-blogs\.js/);
  });

  it('pins Node 22 for SSR build steps', () => {
    expect(amplifyYml).toMatch(/nvm use 22/);
  });

  it('deploys the Gen 2 backend via pipeline-deploy before the frontend build', () => {
    expect(amplifyYml).toMatch(/ampx pipeline-deploy/);
    expect(amplifyYml).toMatch(/\$AWS_BRANCH/);
    expect(amplifyYml).toMatch(/\$AWS_APP_ID/);
  });
});
