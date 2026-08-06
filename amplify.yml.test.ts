import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

describe('amplify.yml Hosting contract', () => {
  const amplifyYml = readFileSync(
    path.join(process.cwd(), 'amplify.yml'),
    'utf8',
  );

  it('does not clone a private blog repo or run sync-blogs', () => {
    expect(amplifyYml).not.toMatch(/SSH_PRIVATE_KEY/);
    expect(amplifyYml).not.toMatch(/BLOG_REPO_URL/);
    expect(amplifyYml).not.toMatch(/sync-blogs\.js/);
    expect(amplifyYml).not.toMatch(/temp-blog-repo/);
  });

  it('pins Node 22 for SSR build steps', () => {
    expect(amplifyYml).toMatch(/nvm use 22/);
  });

  it('gates Gen 2 backend deploy and falls back to generate outputs', () => {
    expect(amplifyYml).toMatch(/scripts\/amplify-backend-changed\.ts/);
    expect(amplifyYml).toMatch(/ampx pipeline-deploy/);
    expect(amplifyYml).toMatch(/ampx generate outputs/);
    expect(amplifyYml).toMatch(/\$AWS_BRANCH/);
    expect(amplifyYml).toMatch(/\$AWS_APP_ID/);
  });

  it('reuses backend node_modules on the frontend when present', () => {
    expect(amplifyYml).toMatch(/Reusing node_modules from backend phase/);
    expect(amplifyYml).toMatch(/npm config set cache \.npm/);
    expect(amplifyYml).toMatch(/\.npm\/\*\*\/\*/);
  });

  it('caches the Next.js build cache on Amplify', () => {
    expect(amplifyYml).toMatch(/\.next\/cache\/\*\*\/\*/);
  });
});
