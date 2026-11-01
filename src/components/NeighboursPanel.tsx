import { getVector, type Embeddings, type Neighbour } from '../lib/vectors.ts'
import { NeighbourList } from './NeighbourList.tsx'
import { Panel } from './Panel.tsx'
import { VectorStrip } from './VectorStrip.tsx'

interface NeighboursPanelProps {
  active: boolean
  onActivate: () => void
  embeddings: Embeddings
  word: string
  onWordChange: (word: string) => void
  neighbours: Neighbour[] | undefined
  onExplore: (word: string) => void
}

export function NeighboursPanel(props: NeighboursPanelProps) {
  const { embeddings, word, onWordChange, neighbours, onExplore } = props
  const query = word.trim().toLowerCase()
  const vector = getVector(embeddings, query)

  return (
    <Panel
      title="Nearest neighbours"
      description="The 10 words whose vectors point in the most similar direction, scored by cosine similarity."
      active={props.active}
      onActivate={props.onActivate}
    >
      <label className="field">
        <span>Word</span>
        <input value={word} onChange={(e) => onWordChange(e.target.value)} spellCheck={false} />
      </label>
      {vector && (
        <figure className="vector-figure">
          <VectorStrip vector={vector} />
          <figcaption>“{query}” is these 50 numbers. Blue is negative, orange is positive.</figcaption>
        </figure>
      )}
      {neighbours ? (
        <NeighbourList neighbours={neighbours} onExplore={onExplore} />
      ) : (
        query && <p className="hint">“{query}” isn't one of the 20,000 most common words.</p>
      )}
    </Panel>
  )
}
