import { describe, expect, it } from 'vitest';
import type { JobMarketSnapshot } from './job-market-lab';
import {
  filterJobMarketPulse,
  OWNER_PULSE_FILTER_DIMENSIONS,
  PUBLIC_PULSE_FILTER_DIMENSIONS,
  sanitiseFilterSelection,
  type JobMarketCorpusMeta,
  type JobMarketPulseFilterSelection,
} from './job-market-pulse-filters';

const snapshot: JobMarketSnapshot = {
  documentCount: 4,
  publishedAt: '2026-07-14T12:00:00.000Z',
  technologies: [
    { name: 'python', count: 3 },
    { name: 'sql', count: 2 },
  ],
  skills: [
    { name: 'python', count: 3 },
    { name: 'sql', count: 2 },
  ],
  seniority: [
    { name: 'senior', count: 2 },
    { name: 'mid', count: 2 },
  ],
  roleFamily: [
    { name: 'data_science', count: 3 },
    { name: 'analytics', count: 1 },
  ],
  clusters: [
    { id: 0, size: 2, label: 'Python stack' },
    { id: 1, size: 2, label: 'SQL analytics' },
  ],
  projection: [
    { x: 0.1, y: 0.2, clusterId: 0 },
    { x: 0.3, y: 0.4, clusterId: 1 },
    { x: 0.5, y: 0.6, clusterId: 0 },
    { x: 0.7, y: 0.8, clusterId: 1 },
  ],
};

const corpusMeta: JobMarketCorpusMeta = {
  documents: [
    {
      id: 'jd-1',
      collectedAt: '2026-06-01T00:00:00.000Z',
      seniority: 'senior',
      roleFamily: 'data_science',
      employerSizeTier: 'enterprise',
      employerPrestigeTier: 'elite',
      technologies: ['python', 'sql'],
      clusterId: 0,
      projectionX: 0.1,
      projectionY: 0.2,
    },
    {
      id: 'jd-2',
      collectedAt: '2026-01-15T00:00:00.000Z',
      seniority: 'mid',
      roleFamily: 'analytics',
      employerSizeTier: 'scaleup',
      employerPrestigeTier: 'mid',
      technologies: ['python'],
      clusterId: 1,
      projectionX: 0.3,
      projectionY: 0.4,
    },
    {
      id: 'jd-3',
      collectedAt: '2025-06-01T00:00:00.000Z',
      seniority: 'senior',
      roleFamily: 'data_science',
      employerSizeTier: 'enterprise',
      employerPrestigeTier: 'high',
      technologies: ['python'],
      clusterId: 0,
      projectionX: 0.5,
      projectionY: 0.6,
    },
    {
      id: 'jd-4',
      collectedAt: '2024-01-01T00:00:00.000Z',
      seniority: 'mid',
      roleFamily: 'data_science',
      employerSizeTier: 'startup',
      employerPrestigeTier: 'low',
      technologies: ['sql'],
      clusterId: 1,
      projectionX: 0.7,
      projectionY: 0.8,
    },
  ],
};

const now = new Date('2026-07-14T12:00:00.000Z');

describe('filterJobMarketPulse', () => {
  it('returns snapshot aggregates unchanged when corpusMeta is absent', () => {
    const result = filterJobMarketPulse(
      { snapshot },
      {},
      { audience: 'owner', now },
    );

    expect(result.documentCount).toBe(4);
    expect(result.technologies).toEqual(snapshot.technologies);
    expect(result.clusters).toEqual(snapshot.clusters);
  });

  it('filters technologies and themes by seniority for owner audience', () => {
    const selection: JobMarketPulseFilterSelection = { seniority: 'senior' };

    const result = filterJobMarketPulse(
      { snapshot, corpusMeta },
      selection,
      { audience: 'owner', now },
    );

    expect(result.documentCount).toBe(2);
    expect(result.technologies).toEqual([
      { name: 'python', count: 2 },
      { name: 'sql', count: 1 },
    ]);
    expect(result.clusters).toEqual([
      { id: 0, size: 2, label: 'Python stack' },
      { id: 1, size: 0, label: 'SQL analytics' },
    ]);
    expect(result.seniority).toEqual([{ name: 'senior', count: 2 }]);
  });

  it('filters by role family and employer prestige tier', () => {
    const result = filterJobMarketPulse(
      { snapshot, corpusMeta },
      { roleFamily: 'data_science', employerPrestigeTier: 'elite' },
      { audience: 'owner', now },
    );

    expect(result.documentCount).toBe(1);
    expect(result.technologies).toEqual([{ name: 'python', count: 1 }, { name: 'sql', count: 1 }]);
  });

  it('filters by employer size tier', () => {
    const result = filterJobMarketPulse(
      { snapshot, corpusMeta },
      { employerSizeTier: 'scaleup' },
      { audience: 'owner', now },
    );

    expect(result.documentCount).toBe(1);
    expect(result.roleFamily).toEqual([{ name: 'analytics', count: 1 }]);
  });

  it('filters by time window using collectedAt', () => {
    const result = filterJobMarketPulse(
      { snapshot, corpusMeta },
      { timeWindow: '6m' },
      { audience: 'owner', now },
    );

    expect(result.documentCount).toBe(2);
    expect(result.technologies).toEqual([
      { name: 'python', count: 2 },
      { name: 'sql', count: 1 },
    ]);
  });

  it('rebuilds projection points from filtered corpusMeta', () => {
    const result = filterJobMarketPulse(
      { snapshot, corpusMeta },
      { seniority: 'mid' },
      { audience: 'owner', now },
    );

    expect(result.projection).toEqual([
      { x: 0.3, y: 0.4, clusterId: 1 },
      { x: 0.7, y: 0.8, clusterId: 1 },
    ]);
  });

  it('ignores employer tier filters for public audience', () => {
    const ownerOnly = filterJobMarketPulse(
      { snapshot, corpusMeta },
      { employerPrestigeTier: 'elite' },
      { audience: 'owner', now },
    );
    const publicAttempt = filterJobMarketPulse(
      { snapshot, corpusMeta },
      { employerPrestigeTier: 'elite' },
      { audience: 'public', now },
    );

    expect(ownerOnly.documentCount).toBe(1);
    expect(publicAttempt.documentCount).toBe(4);
  });

  it('allows public time window filtering only', () => {
    const result = filterJobMarketPulse(
      { snapshot, corpusMeta },
      { timeWindow: '12m' },
      { audience: 'public', now },
    );

    expect(result.documentCount).toBe(2);
  });
});

describe('sanitiseFilterSelection', () => {
  it('exposes owner and public dimension sets', () => {
    expect(OWNER_PULSE_FILTER_DIMENSIONS).toContain('employerPrestigeTier');
    expect(PUBLIC_PULSE_FILTER_DIMENSIONS).toEqual(['timeWindow']);
  });

  it('strips sensitive dimensions for public audience', () => {
    expect(
      sanitiseFilterSelection(
        {
          timeWindow: '6m',
          seniority: 'senior',
          employerPrestigeTier: 'elite',
        },
        'public',
      ),
    ).toEqual({ timeWindow: '6m' });
  });
});
