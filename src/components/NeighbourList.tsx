import type { Neighbour } from '../lib/vectors.ts'

interface NeighbourListProps {
  neighbours: Neighbour[]
  /** Clicking a word looks up its own neighbours. */
  onExplore: (word: string) => void
  highlightFirst?: boolean
}

export function NeighbourList({ neighbours, onExplore, highlightFirst = false }: NeighbourListProps) {
  return (
    <ol className="neighbours">
      {neighbours.map(({ word, similarity }, i) => (
        <li key={word} className={highlightFirst && i === 0 ? 'top' : undefined}>
          <button type="button" className="word-button" onClick={() => onExplore(word)}>
            {word}
          </button>
          <span className="bar" aria-hidden="true">
            <span style={{ width: `${Math.max(similarity, 0) * 100}%` }} />
          </span>
          <span className="score">{similarity.toFixed(3)}</span>
        </li>
      ))}
    </ol>
  )
}
