/**
 * Principal component analysis, with no math library.
 *
 * Each word is a point in 50 dimensions, which we can't draw. PCA finds the two
 * directions along which the points are most spread out, and we draw each word
 * by how far it sits along those two directions. It's a flattened shadow of the
 * real space: words close on the plot are often close in 50D, but not always.
 */
import { dot, type Vector } from './vectors.ts'

export interface Pca {
  mean: Float64Array
  /** Unit-length directions, most spread-out first. */
  components: Float64Array[]
}

export type Point = [x: number, y: number]

/** `rows` holds `rows.length / dim` points of `dim` numbers each, back to back. */
export function fitPca(rows: Float32Array, dim: number, componentCount = 2): Pca {
  const n = rows.length / dim

  // 1. The average point, so we can measure spread around the centre.
  const mean = new Float64Array(dim)
  for (let r = 0; r < n; r++) {
    for (let i = 0; i < dim; i++) mean[i] += rows[r * dim + i] / n
  }

  // 2. Covariance matrix: entry (i, j) says how dimensions i and j vary together.
  const covariance = new Float64Array(dim * dim)
  const centred = new Float64Array(dim)
  for (let r = 0; r < n; r++) {
    for (let i = 0; i < dim; i++) centred[i] = rows[r * dim + i] - mean[i]
    for (let i = 0; i < dim; i++) {
      for (let j = i; j < dim; j++) covariance[i * dim + j] += centred[i] * centred[j]
    }
  }
  for (let i = 0; i < dim; i++) {
    for (let j = i; j < dim; j++) {
      const value = covariance[i * dim + j] / Math.max(n - 1, 1)
      covariance[i * dim + j] = value
      covariance[j * dim + i] = value
    }
  }

  // 3. The directions of most spread are the covariance matrix's top
  //    eigenvectors. Find one, remove it from the matrix, repeat.
  const components: Float64Array[] = []
  for (let c = 0; c < componentCount; c++) {
    const { vector, value } = topEigenvector(covariance, dim)
    components.push(vector)
    for (let i = 0; i < dim; i++) {
      for (let j = 0; j < dim; j++) covariance[i * dim + j] -= value * vector[i] * vector[j]
    }
  }

  return { mean, components }
}

/** Where a vector lands on the plot: its offset from the mean along each component. */
export function project(pca: Pca, v: Vector): Point {
  const centred = new Float64Array(v.length)
  for (let i = 0; i < v.length; i++) centred[i] = v[i] - pca.mean[i]
  return [dot(centred, pca.components[0]), dot(centred, pca.components[1])]
}

/**
 * Power iteration: multiply any starting vector by the matrix over and over and
 * it swings round to point along the eigenvector with the largest eigenvalue.
 */
function topEigenvector(matrix: Float64Array, dim: number): { vector: Float64Array; value: number } {
  // Fixed, uneven start so the result is the same every run.
  let vector = scaleToUnit(Float64Array.from({ length: dim }, (_, i) => Math.sin(i + 1)))
  let value = 0

  for (let step = 0; step < 500; step++) {
    const next = multiply(matrix, vector, dim)
    value = Math.sqrt(dot(next, next))
    if (value === 0) break // nothing left to explain, e.g. a single point
    const unit = scaleToUnit(next)
    const change = Math.abs(1 - Math.abs(dot(unit, vector)))
    vector = unit
    if (change < 1e-12) break
  }

  // An eigenvector can point either way. Pick the way whose largest entry is
  // positive so the plot doesn't flip when it's recomputed.
  let largest = 0
  for (let i = 0; i < dim; i++) if (Math.abs(vector[i]) > Math.abs(vector[largest])) largest = i
  if (vector[largest] < 0) vector = vector.map((x) => -x)

  return { vector, value }
}

function multiply(matrix: Float64Array, v: Float64Array, dim: number): Float64Array {
  const result = new Float64Array(dim)
  for (let i = 0; i < dim; i++) {
    let sum = 0
    for (let j = 0; j < dim; j++) sum += matrix[i * dim + j] * v[j]
    result[i] = sum
  }
  return result
}

function scaleToUnit(v: Float64Array): Float64Array {
  const length = Math.sqrt(dot(v, v))
  return length === 0 ? v : v.map((x) => x / length)
}
