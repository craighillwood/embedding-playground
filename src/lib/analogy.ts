import {
  addScaled,
  getVector,
  nearestNeighbours,
  normalize,
  type Embeddings,
  type Neighbour,
} from './vectors.ts'

export interface Term {
  word: string
  sign: 1 | -1
}

/**
 * Parses word arithmetic like "king - man + woman" into signed terms.
 * The first word is positive unless it starts with a minus.
 */
export function parseExpression(input: string): Term[] {
  const tokens = input.toLowerCase().match(/[+-]|[^\s+-]+/g) ?? []
  const terms: Term[] = []
  let sign: 1 | -1 = 1

  for (const token of tokens) {
    if (token === '+') sign = 1
    else if (token === '-') sign = -1
    else {
      terms.push({ word: token, sign })
      sign = 1
    }
  }
  return terms
}

export type AnalogyResult =
  | { kind: 'ok'; neighbours: Neighbour[] }
  | { kind: 'unknown-words'; words: string[] }
  | { kind: 'empty' }

/**
 * Adds and subtracts the word vectors, then finds the words nearest to the
 * resulting point. For "king - man + woman", the idea is: start at king, take
 * away the "male" direction, add the "female" one, and see what's there.
 *
 * Each vector is scaled to length 1 first so every word gets an equal say in
 * the sum, however long its vector is. The input words are excluded, since
 * the sum usually lands closest to "king" itself.
 */
export function solveExpression(embeddings: Embeddings, terms: Term[], k = 5): AnalogyResult {
  if (terms.length === 0) return { kind: 'empty' }

  const unknown = terms.filter((term) => !embeddings.indexOf.has(term.word)).map((t) => t.word)
  if (unknown.length > 0) return { kind: 'unknown-words', words: unknown }

  const sum = new Float32Array(embeddings.dim)
  for (const term of terms) {
    addScaled(sum, normalize(getVector(embeddings, term.word)!), term.sign)
  }

  const inputs = new Set(terms.map((term) => term.word))
  return { kind: 'ok', neighbours: nearestNeighbours(embeddings, sum, k, inputs) }
}
