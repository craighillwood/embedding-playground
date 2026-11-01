import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { parseExpression, solveExpression } from './analogy.ts'
import { fitPca, project } from './pca.ts'
import { cosineSimilarity, createEmbeddings, getVector, nearestNeighbours } from './vectors.ts'

const v = (...values: number[]) => Float32Array.from(values)

describe('cosineSimilarity', () => {
  it('is 1 for the same direction, 0 at right angles, -1 for opposite', () => {
    expect(cosineSimilarity(v(1, 2), v(2, 4))).toBeCloseTo(1)
    expect(cosineSimilarity(v(1, 0), v(0, 3))).toBeCloseTo(0)
    expect(cosineSimilarity(v(1, 1), v(-1, -1))).toBeCloseTo(-1)
  })

  it('is 0 for a zero vector instead of NaN', () => {
    expect(cosineSimilarity(v(0, 0), v(1, 1))).toBe(0)
  })
})

describe('nearestNeighbours', () => {
  const toy = createEmbeddings(['east', 'north', 'west', 'northeast'], v(1, 0, 0, 1, -1, 0, 1, 1))

  it('returns the k most similar words, best first, skipping excluded ones', () => {
    const result = nearestNeighbours(toy, getVector(toy, 'east')!, 2, new Set(['east']))
    expect(result.map((n) => n.word)).toEqual(['northeast', 'north'])
    expect(result[0].similarity).toBeCloseTo(Math.SQRT1_2)
  })
})

describe('parseExpression', () => {
  it('reads signed terms', () => {
    expect(parseExpression(' King -man+ woman ')).toEqual([
      { word: 'king', sign: 1 },
      { word: 'man', sign: -1 },
      { word: 'woman', sign: 1 },
    ])
  })
})

describe('fitPca', () => {
  it('finds the direction the points are spread along', () => {
    // Points along the line y = x, so the first component is (1, 1) / sqrt(2).
    const pca = fitPca(v(0, 0, 1, 1, 2, 2, 3, 3), 2)
    expect(pca.components[0][0]).toBeCloseTo(Math.SQRT1_2)
    expect(pca.components[0][1]).toBeCloseTo(Math.SQRT1_2)
    expect(project(pca, v(3, 3))[0]).toBeCloseTo(1.5 * Math.SQRT2)
  })
})

describe('with the real GloVe vectors', () => {
  const words = readFileSync('public/data/words.txt', 'utf8').split('\n')
  const bytes = readFileSync('public/data/vectors.bin')
  const vectors = new Float32Array(bytes.buffer, bytes.byteOffset, bytes.byteLength / 4)
  const glove = createEmbeddings(words, vectors)

  it('solves king - man + woman = queen', () => {
    const result = solveExpression(glove, parseExpression('king - man + woman'))
    expect(result.kind === 'ok' && result.neighbours[0].word).toBe('queen')
  })

  it('reports words that are not in the vocabulary', () => {
    expect(solveExpression(glove, parseExpression('king - qwzx'))).toEqual({
      kind: 'unknown-words',
      words: ['qwzx'],
    })
  })
})
