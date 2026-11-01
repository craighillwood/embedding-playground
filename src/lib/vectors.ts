/**
 * Plain vector math for word embeddings. No ML libraries: every operation is
 * a loop over the numbers, so you can read exactly what the model "sees".
 */

export type Vector = Float32Array

/** A vocabulary plus one vector per word, stored back to back in one flat array. */
export interface Embeddings {
  words: string[]
  dim: number
  /** Row i (`dim` numbers starting at i * dim) is the vector for words[i]. */
  vectors: Float32Array
  indexOf: Map<string, number>
}

export interface Neighbour {
  word: string
  similarity: number
}

export function createEmbeddings(words: string[], vectors: Float32Array): Embeddings {
  const dim = vectors.length / words.length
  if (!Number.isInteger(dim)) {
    throw new Error(`${vectors.length} numbers can't be split evenly over ${words.length} words`)
  }
  return { words, dim, vectors, indexOf: new Map(words.map((word, i) => [word, i])) }
}

/** The vector for row i, as a view into the shared array (no copying). */
export function rowVector(embeddings: Embeddings, i: number): Vector {
  return embeddings.vectors.subarray(i * embeddings.dim, (i + 1) * embeddings.dim)
}

export function getVector(embeddings: Embeddings, word: string): Vector | undefined {
  const i = embeddings.indexOf.get(word)
  return i === undefined ? undefined : rowVector(embeddings, i)
}

export function dot(a: ArrayLike<number>, b: ArrayLike<number>): number {
  let sum = 0
  for (let i = 0; i < a.length; i++) sum += a[i] * b[i]
  return sum
}

/** Length of a vector: the square root of its dot product with itself. */
export function norm(a: Vector): number {
  return Math.sqrt(dot(a, a))
}

/**
 * Cosine of the angle between two vectors: 1 means they point the same way,
 * 0 means unrelated (at right angles), -1 means opposite. Dividing by the
 * lengths means only the direction counts, not how big the numbers are.
 */
export function cosineSimilarity(a: Vector, b: Vector): number {
  const lengths = norm(a) * norm(b)
  return lengths === 0 ? 0 : dot(a, b) / lengths
}

/** Same direction, length 1. */
export function normalize(a: Vector): Vector {
  const length = norm(a)
  const result = new Float32Array(a.length)
  if (length === 0) return result
  for (let i = 0; i < a.length; i++) result[i] = a[i] / length
  return result
}

/** Adds `scale * b` to `target` in place. */
export function addScaled(target: Vector, b: Vector, scale: number): void {
  for (let i = 0; i < target.length; i++) target[i] += scale * b[i]
}

/**
 * The words whose vectors point most nearly in the same direction as `target`.
 * This one function powers every feature: neighbours of a word, "closest to
 * both" when comparing, and the answer to an analogy.
 *
 * It's a brute-force scan: compare against every word and keep the best k.
 * Each cosine similarity is three dot products of 50 numbers (a · b, and both
 * lengths), so 20k words is about three million multiplications, which still
 * takes only a few milliseconds. The target's length is the same every time,
 * so it could be computed once, but at this size clarity wins.
 */
export function nearestNeighbours(
  embeddings: Embeddings,
  target: Vector,
  k = 10,
  exclude: ReadonlySet<string> = new Set(),
): Neighbour[] {
  const best: Neighbour[] = [] // sorted, most similar first

  for (let i = 0; i < embeddings.words.length; i++) {
    const word = embeddings.words[i]
    if (exclude.has(word)) continue

    const similarity = cosineSimilarity(target, rowVector(embeddings, i))
    if (best.length === k && similarity <= best[k - 1].similarity) continue

    // Insert in sorted position, then drop whatever fell off the end.
    let position = best.length
    while (position > 0 && best[position - 1].similarity < similarity) position--
    best.splice(position, 0, { word, similarity })
    if (best.length > k) best.pop()
  }

  return best
}
