import { useMemo, useState } from 'react'
import { fitPca, project, type Pca, type Point } from '../lib/pca.ts'
import { getVector, type Embeddings } from '../lib/vectors.ts'

export interface HighlightedWord {
  word: string
  role: 'input' | 'result' | 'neighbour'
}

interface EmbeddingPlotProps {
  embeddings: Embeddings
  caption: string
  highlighted: HighlightedWord[]
}

/** How many of the most common words to draw as faint background dots. */
const BACKGROUND_WORDS = 2000
const SIZE = 600
const PADDING = 48

type View = 'all' | 'fit'

export function EmbeddingPlot({ embeddings, caption, highlighted }: EmbeddingPlotProps) {
  const [view, setView] = useState<View>('all')

  // One map for the whole vocabulary, computed once after loading.
  const globalPca = useMemo(() => fitPca(embeddings.vectors, embeddings.dim), [embeddings])

  const visible = useMemo(() => {
    const seen = new Set<string>()
    return highlighted.filter(({ word }) => {
      if (seen.has(word) || !embeddings.indexOf.has(word)) return false
      seen.add(word)
      return true
    })
  }, [embeddings, highlighted])

  // "Fit" recomputes PCA from just the highlighted words, which spreads them
  // out and often shows structure (like analogy parallelograms) more clearly.
  const canFit = visible.length >= 3
  const pca = useMemo((): Pca => {
    if (view === 'all' || !canFit) return globalPca
    const rows = new Float32Array(visible.length * embeddings.dim)
    visible.forEach(({ word }, i) => rows.set(getVector(embeddings, word)!, i * embeddings.dim))
    return fitPca(rows, embeddings.dim)
  }, [view, canFit, globalPca, visible, embeddings])
  const fitted = pca !== globalPca

  const background = useMemo(() => {
    const count = Math.min(BACKGROUND_WORDS, embeddings.words.length)
    return Array.from({ length: count }, (_, i) => project(pca, getVector(embeddings, embeddings.words[i])!))
  }, [pca, embeddings])

  const points = visible
    .map((h) => ({ ...h, point: project(pca, getVector(embeddings, h.word)!) }))
    // Draw neighbours first so the inputs and the answer sit on top.
    .sort((a, b) => Number(a.role !== 'neighbour') - Number(b.role !== 'neighbour'))
  const toScreen = makeScale(fitted ? [] : background, points.map((p) => p.point))

  // All background dots as a single path: much cheaper than 2,000 elements.
  const backgroundPath = background
    .map((p) => {
      const [x, y] = toScreen(p)
      return `M${x.toFixed(1)} ${y.toFixed(1)}h0`
    })
    .join('')

  return (
    <figure className="plot">
      <div className="plot-header">
        <figcaption>{caption}</figcaption>
        <fieldset className="toggle">
          <legend>Map</legend>
          <label>
            <input type="radio" name="view" checked={view === 'all'} onChange={() => setView('all')} />
            All words
          </label>
          <label>
            <input type="radio" name="view" checked={view === 'fit'} onChange={() => setView('fit')} disabled={!canFit} />
            Fit to these
          </label>
        </fieldset>
      </div>
      <svg viewBox={`0 0 ${SIZE} ${SIZE}`} role="img" aria-label={`2D map of word vectors. ${caption}`}>
        {!fitted && <path d={backgroundPath} className="background-dots" />}
        {points.map(({ word, role, point }) => {
          const [x, y] = toScreen(point)
          return (
            <g key={word} className={`point ${role}`} transform={`translate(${x} ${y})`}>
              <circle r={role === 'neighbour' ? 4 : 6} />
              <text x={9} y={4}>
                {word}
              </text>
            </g>
          )
        })}
      </svg>
      <p className="plot-note">
        50 dimensions squashed into 2 with PCA, so distances here are only a rough guide.
        {!fitted && ` Grey dots are the ${BACKGROUND_WORDS.toLocaleString()} most common words.`}
      </p>
    </figure>
  )
}

/**
 * Maps PCA coordinates to SVG pixels, keeping the aspect ratio. The bounds come
 * from the middle 98% of `core` (so a few outlier words don't shrink the whole
 * cloud) widened to fit every point in `mustFit`.
 */
function makeScale(core: Point[], mustFit: Point[] = []): (p: Point) => Point {
  const xs = core.map(([x]) => x).sort((a, b) => a - b)
  const ys = core.map(([, y]) => y).sort((a, b) => a - b)
  const trim = Math.floor(core.length * 0.01)
  let minX = xs[trim] ?? Infinity, maxX = xs[xs.length - 1 - trim] ?? -Infinity
  let minY = ys[trim] ?? Infinity, maxY = ys[ys.length - 1 - trim] ?? -Infinity
  for (const [x, y] of mustFit) {
    minX = Math.min(minX, x)
    maxX = Math.max(maxX, x)
    minY = Math.min(minY, y)
    maxY = Math.max(maxY, y)
  }
  const span = Math.max(maxX - minX, maxY - minY) || 1
  const scale = (SIZE - 2 * PADDING) / span
  const offsetX = (SIZE - (maxX - minX) * scale) / 2
  const offsetY = (SIZE - (maxY - minY) * scale) / 2
  // SVG y grows downwards, so flip it.
  return ([x, y]) => [offsetX + (x - minX) * scale, SIZE - offsetY - (y - minY) * scale]
}
