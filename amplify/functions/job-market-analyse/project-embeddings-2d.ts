/**
 * Project embedding vectors to 2D via PCA (top two principal components).
 * Uses the dual (Gram) form so cost scales with document count, not embedding width.
 */

export type Point2D = { x: number; y: number };

function dot(a: number[], b: number[]): number {
  let sum = 0;
  const length = Math.min(a.length, b.length);
  for (let index = 0; index < length; index += 1) {
    sum += (a[index] ?? 0) * (b[index] ?? 0);
  }
  return sum;
}

function norm(vector: number[]): number {
  return Math.sqrt(dot(vector, vector));
}

function matVec(matrix: number[][], vector: number[]): number[] {
  return matrix.map((row) => dot(row, vector));
}

/** Power iteration for the leading eigenvector of a symmetric matrix. */
function leadingEigenpair(
  matrix: number[][],
  exclude?: number[],
  iterations: number = 64,
): { value: number; vector: number[] } {
  const n = matrix.length;
  if (n === 0) {
    return { value: 0, vector: [] };
  }

  let vector = Array.from({ length: n }, (_, index) =>
    exclude ? (index === 0 ? 1 : 0.01 * index) : Math.sin(index + 1),
  );

  if (exclude) {
    const projection = dot(vector, exclude);
    vector = vector.map((value, index) => value - projection * (exclude[index] ?? 0));
  }

  let length = norm(vector);
  if (length < 1e-12) {
    vector = Array.from({ length: n }, (_, index) => (index === 0 ? 1 : 0));
    if (exclude) {
      const projection = dot(vector, exclude);
      vector = vector.map((value, index) => value - projection * (exclude[index] ?? 0));
      length = norm(vector);
      if (length < 1e-12) {
        return { value: 0, vector: new Array(n).fill(0) };
      }
    }
  }
  vector = vector.map((value) => value / (length || 1));

  let value = 0;
  for (let iteration = 0; iteration < iterations; iteration += 1) {
    let next = matVec(matrix, vector);
    if (exclude) {
      const projection = dot(next, exclude);
      next = next.map((entry, index) => entry - projection * (exclude[index] ?? 0));
    }
    const nextNorm = norm(next);
    if (nextNorm < 1e-12) {
      return { value: 0, vector };
    }
    vector = next.map((entry) => entry / nextNorm);
    value = dot(vector, matVec(matrix, vector));
  }

  return { value, vector };
}

function buildGram(centered: number[][]): number[][] {
  const n = centered.length;
  const gram: number[][] = Array.from({ length: n }, () => new Array(n).fill(0));
  for (let i = 0; i < n; i += 1) {
    for (let j = i; j < n; j += 1) {
      const value = dot(centered[i]!, centered[j]!);
      gram[i]![j] = value;
      gram[j]![i] = value;
    }
  }
  return gram;
}

/**
 * Returns one 2D point per input vector (same order).
 * Degenerate cases (empty, single point, identical vectors) collapse to the origin / axis.
 */
export function projectEmbeddingsTo2D(vectors: number[][]): Point2D[] {
  const n = vectors.length;
  if (n === 0) {
    return [];
  }

  const dimensions = vectors[0]?.length ?? 0;
  if (dimensions === 0) {
    return vectors.map(() => ({ x: 0, y: 0 }));
  }

  if (n === 1) {
    return [{ x: 0, y: 0 }];
  }

  const mean = new Array(dimensions).fill(0);
  for (const vector of vectors) {
    for (let dim = 0; dim < dimensions; dim += 1) {
      mean[dim] += vector[dim] ?? 0;
    }
  }
  for (let dim = 0; dim < dimensions; dim += 1) {
    mean[dim] /= n;
  }

  const centered = vectors.map((vector) =>
    Array.from({ length: dimensions }, (_, dim) => (vector[dim] ?? 0) - mean[dim]),
  );

  if (dimensions === 1) {
    return centered.map((vector) => ({ x: vector[0] ?? 0, y: 0 }));
  }

  const gram = buildGram(centered);
  const first = leadingEigenpair(gram);
  const second = leadingEigenpair(gram, first.vector);

  const scaleX = Math.sqrt(Math.max(first.value, 0));
  const scaleY = Math.sqrt(Math.max(second.value, 0));

  return Array.from({ length: n }, (_, index) => ({
    x: scaleX * (first.vector[index] ?? 0),
    y: scaleY * (second.vector[index] ?? 0),
  }));
}
