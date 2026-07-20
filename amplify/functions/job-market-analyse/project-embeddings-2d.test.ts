import { describe, expect, it } from 'vitest';
import { projectEmbeddingsTo2D } from './project-embeddings-2d';

describe('projectEmbeddingsTo2D', () => {
  it('returns empty output for empty input', () => {
    expect(projectEmbeddingsTo2D([])).toEqual([]);
  });

  it('maps a single vector to the origin', () => {
    expect(projectEmbeddingsTo2D([[1, 2, 3]])).toEqual([{ x: 0, y: 0 }]);
  });

  it('separates points that differ along one dominant axis', () => {
    const points = projectEmbeddingsTo2D([
      [0, 0, 0],
      [10, 0, 0],
      [20, 0, 0],
      [0, 1, 0],
      [10, 1, 0],
      [20, 1, 0],
    ]);

    expect(points).toHaveLength(6);
    const xs = points.map((point) => point.x);
    const spanX = Math.max(...xs) - Math.min(...xs);
    const ys = points.map((point) => point.y);
    const spanY = Math.max(...ys) - Math.min(...ys);

    // First PC should capture the large x-spread; second the small y-spread.
    expect(spanX).toBeGreaterThan(spanY);
    expect(spanX).toBeGreaterThan(10);
    expect(spanY).toBeGreaterThan(0.5);
  });

  it('does not use raw first-two embedding dimensions as coordinates', () => {
    // Variance lives in dims 2–3; dims 0–1 are constant noise.
    const vectors = [
      [0.01, 0.02, 0, 0],
      [0.01, 0.02, 10, 0],
      [0.01, 0.02, 0, 8],
      [0.01, 0.02, 10, 8],
    ];
    const points = projectEmbeddingsTo2D(vectors);

    const firstTwoDims = vectors.map((vector) => ({ x: vector[0]!, y: vector[1]! }));
    expect(points).not.toEqual(firstTwoDims);

    const spanX = Math.max(...points.map((p) => p.x)) - Math.min(...points.map((p) => p.x));
    const spanY = Math.max(...points.map((p) => p.y)) - Math.min(...points.map((p) => p.y));
    expect(spanX).toBeGreaterThan(1);
    expect(spanY).toBeGreaterThan(1);
  });

  it('collapses identical vectors to the origin', () => {
    const points = projectEmbeddingsTo2D([
      [1, 1, 1],
      [1, 1, 1],
      [1, 1, 1],
    ]);
    for (const point of points) {
      expect(Math.abs(point.x)).toBeLessThan(1e-9);
      expect(Math.abs(point.y)).toBeLessThan(1e-9);
    }
  });
});
