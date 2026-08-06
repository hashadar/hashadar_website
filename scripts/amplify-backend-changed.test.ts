import { describe, expect, it } from 'vitest';
import {
  backendNeedsDeploy,
  isBackendDep,
  packageFilesForceRedeploy,
  relevantDepVersions,
  relevantLockVersions,
  versionsDiffer,
} from './amplify-backend-changed';

describe('amplify-backend-changed matchers', () => {
  it('matches Amplify, CDK, and AWS SDK packages', () => {
    expect(isBackendDep('@aws-amplify/backend')).toBe(true);
    expect(isBackendDep('aws-amplify')).toBe(true);
    expect(isBackendDep('aws-cdk')).toBe(true);
    expect(isBackendDep('aws-cdk-lib')).toBe(true);
    expect(isBackendDep('constructs')).toBe(true);
    expect(isBackendDep('@aws-sdk/client-bedrock-runtime')).toBe(true);
    expect(isBackendDep('next')).toBe(false);
    expect(isBackendDep('react')).toBe(false);
  });

  it('extracts relevant versions from package.json', () => {
    expect(
      relevantDepVersions({
        dependencies: { next: '16.0.0', 'aws-amplify': '6.1.0' },
        devDependencies: { '@aws-amplify/backend': '1.2.0', eslint: '9.0.0' },
      }),
    ).toEqual({
      'aws-amplify': '6.1.0',
      '@aws-amplify/backend': '1.2.0',
    });
  });

  it('extracts top-level lockfile package versions only', () => {
    expect(
      relevantLockVersions({
        packages: {
          '': {},
          'node_modules/aws-amplify': { version: '6.1.0' },
          'node_modules/next': { version: '16.0.0' },
          'node_modules/aws-amplify/node_modules/foo': { version: '1.0.0' },
        },
      }),
    ).toEqual({ 'aws-amplify': '6.1.0' });
  });

  it('detects version map differences', () => {
    expect(versionsDiffer({ a: '1' }, { a: '1' })).toBe(false);
    expect(versionsDiffer({ a: '1' }, { a: '2' })).toBe(true);
    expect(versionsDiffer({ a: '1' }, {})).toBe(true);
  });
});

describe('backendNeedsDeploy', () => {
  it('redeploys when there is no parent commit', () => {
    expect(backendNeedsDeploy({ parentRef: null })).toBe(true);
  });

  it('redeploys when amplify/ paths change', () => {
    expect(
      backendNeedsDeploy({
        parentRef: 'PARENT',
        changedPaths: ['amplify/backend.ts', 'src/app/page.tsx'],
      }),
    ).toBe(true);
  });

  it('skips when only frontend paths change', () => {
    expect(
      backendNeedsDeploy({
        parentRef: 'PARENT',
        changedPaths: ['src/app/page.tsx', 'docs/CI-AND-DEPLOYMENT.md'],
      }),
    ).toBe(false);
  });

  it('redeploys when Amplify deps change in package.json', () => {
    expect(
      backendNeedsDeploy({
        parentRef: 'PARENT',
        changedPaths: ['package.json'],
        headPkg: {
          dependencies: { 'aws-amplify': '6.2.0' },
        },
        parentPkg: {
          dependencies: { 'aws-amplify': '6.1.0' },
        },
      }),
    ).toBe(true);
  });

  it('skips when package files change but only non-backend deps', () => {
    expect(
      backendNeedsDeploy({
        parentRef: 'PARENT',
        changedPaths: ['package.json', 'package-lock.json'],
        headPkg: {
          dependencies: { next: '16.1.0', 'aws-amplify': '6.1.0' },
        },
        parentPkg: {
          dependencies: { next: '16.0.0', 'aws-amplify': '6.1.0' },
        },
        headLock: {
          packages: {
            'node_modules/next': { version: '16.1.0' },
            'node_modules/aws-amplify': { version: '6.1.0' },
          },
        },
        parentLock: {
          packages: {
            'node_modules/next': { version: '16.0.0' },
            'node_modules/aws-amplify': { version: '6.1.0' },
          },
        },
      }),
    ).toBe(false);
  });

  it('redeploys when lockfile Amplify package versions change', () => {
    expect(
      packageFilesForceRedeploy({
        headPkg: { dependencies: { 'aws-amplify': '^6.1.0' } },
        parentPkg: { dependencies: { 'aws-amplify': '^6.1.0' } },
        headLock: {
          packages: { 'node_modules/aws-amplify': { version: '6.1.1' } },
        },
        parentLock: {
          packages: { 'node_modules/aws-amplify': { version: '6.1.0' } },
        },
      }),
    ).toBe(true);
  });
});
