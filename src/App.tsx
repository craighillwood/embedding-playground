import { useEffect, useMemo, useState } from 'react'
import { AnalogyPanel } from './components/AnalogyPanel.tsx'
import { ComparePanel } from './components/ComparePanel.tsx'
import { EmbeddingPlot, type HighlightedWord } from './components/EmbeddingPlot.tsx'
import { NeighboursPanel } from './components/NeighboursPanel.tsx'
import { parseExpression, solveExpression } from './lib/analogy.ts'
import { loadEmbeddings } from './lib/loadEmbeddings.ts'
import {
  addScaled,
  cosineSimilarity,
  getVector,
  nearestNeighbours,
  normalize,
  type Embeddings,
} from './lib/vectors.ts'

type Panel = 'neighbours' | 'compare' | 'analogy'

type LoadState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; embeddings: Embeddings }

const clean = (input: string) => input.trim().toLowerCase()

export function App() {
  const [load, setLoad] = useState<LoadState>({ status: 'loading' })

  useEffect(() => {
    loadEmbeddings().then(
      (embeddings) => setLoad({ status: 'ready', embeddings }),
      (error: Error) => setLoad({ status: 'error', message: error.message }),
    )
  }, [])

  return (
    <>
      <header className="page-header">
        <h1>Embedding Playground</h1>
        <p>
          A language model turns every word into a list of numbers, a point in space where
          similar meanings end up close together. Explore 20,000 real word vectors from{' '}
          <a href="https://nlp.stanford.edu/projects/glove/">GloVe</a>, with all the math done
          in plain TypeScript in your browser.
        </p>
      </header>
      {load.status === 'loading' && <p className="status">Loading 20,000 word vectors…</p>}
      {load.status === 'error' && <p className="status error">{load.message}</p>}
      {load.status === 'ready' && <Playground embeddings={load.embeddings} />}
      <footer className="page-footer">
        <p>
          Vectors: GloVe 6B, 50 dimensions (Pennington, Socher and Manning, 2014), public domain
          under the PDDL. Built with AI assistance.
        </p>
      </footer>
    </>
  )
}

function Playground({ embeddings }: { embeddings: Embeddings }) {
  const [activePanel, setActivePanel] = useState<Panel>('analogy')
  const [word, setWord] = useState('coffee')
  const [compareA, setCompareA] = useState('cat')
  const [compareB, setCompareB] = useState('dog')
  const [expression, setExpression] = useState('king - man + woman')

  const neighbours = useMemo(() => {
    const query = clean(word)
    const vector = getVector(embeddings, query)
    if (!vector) return undefined
    return nearestNeighbours(embeddings, vector, 10, new Set([query]))
  }, [embeddings, word])

  const comparison = useMemo(() => {
    const a = getVector(embeddings, clean(compareA))
    const b = getVector(embeddings, clean(compareB))
    if (!a || !b) return undefined

    // The point halfway between the two directions: which words sit there?
    const middle = normalize(a)
    addScaled(middle, normalize(b), 1)
    const exclude = new Set([clean(compareA), clean(compareB)])
    return {
      similarity: cosineSimilarity(a, b),
      between: nearestNeighbours(embeddings, middle, 5, exclude),
    }
  }, [embeddings, compareA, compareB])

  const terms = useMemo(() => parseExpression(expression), [expression])
  const analogy = useMemo(() => solveExpression(embeddings, terms), [embeddings, terms])

  const plot = useMemo((): { caption: string; words: HighlightedWord[] } => {
    switch (activePanel) {
      case 'neighbours':
        return {
          caption: `Nearest neighbours of “${clean(word)}”`,
          words: [
            { word: clean(word), role: 'input' },
            ...(neighbours ?? []).map((n) => ({ word: n.word, role: 'neighbour' as const })),
          ],
        }
      case 'compare':
        return {
          caption: `“${clean(compareA)}” and “${clean(compareB)}”, and the words between them`,
          words: [
            { word: clean(compareA), role: 'input' },
            { word: clean(compareB), role: 'input' },
            ...(comparison?.between ?? []).map((n) => ({ word: n.word, role: 'neighbour' as const })),
          ],
        }
      case 'analogy': {
        const results = analogy.kind === 'ok' ? analogy.neighbours : []
        return {
          caption: expression.trim() ? `${expression.trim()} = ?` : 'Analogy',
          words: [
            ...terms.map((t) => ({ word: t.word, role: 'input' as const })),
            ...results.map((n, i) => ({ word: n.word, role: i === 0 ? ('result' as const) : ('neighbour' as const) })),
          ],
        }
      }
    }
  }, [activePanel, word, neighbours, compareA, compareB, comparison, expression, terms, analogy])

  const explore = (next: string) => {
    setWord(next)
    setActivePanel('neighbours')
  }

  return (
    <main className="playground">
      <div className="panels">
        <NeighboursPanel
          active={activePanel === 'neighbours'}
          onActivate={() => setActivePanel('neighbours')}
          embeddings={embeddings}
          word={word}
          onWordChange={setWord}
          neighbours={neighbours}
          onExplore={explore}
        />
        <ComparePanel
          active={activePanel === 'compare'}
          onActivate={() => setActivePanel('compare')}
          a={compareA}
          b={compareB}
          onAChange={setCompareA}
          onBChange={setCompareB}
          comparison={comparison}
          onExplore={explore}
        />
        <AnalogyPanel
          active={activePanel === 'analogy'}
          onActivate={() => setActivePanel('analogy')}
          expression={expression}
          onExpressionChange={setExpression}
          result={analogy}
          onExplore={explore}
        />
      </div>
      <EmbeddingPlot embeddings={embeddings} caption={plot.caption} highlighted={plot.words} />
    </main>
  )
}
