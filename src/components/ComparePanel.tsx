import type { Neighbour } from '../lib/vectors.ts'
import { NeighbourList } from './NeighbourList.tsx'
import { Panel } from './Panel.tsx'

interface ComparePanelProps {
  active: boolean
  onActivate: () => void
  a: string
  b: string
  onAChange: (word: string) => void
  onBChange: (word: string) => void
  comparison: { similarity: number; between: Neighbour[] } | undefined
  onExplore: (word: string) => void
}

export function ComparePanel(props: ComparePanelProps) {
  const { a, b, onAChange, onBChange, comparison, onExplore } = props

  return (
    <Panel
      title="Compare two words"
      description="Cosine similarity: 1 means the vectors point the same way, 0 means unrelated, -1 means opposite."
      active={props.active}
      onActivate={props.onActivate}
    >
      <div className="field-row">
        <label className="field">
          <span>First word</span>
          <input value={a} onChange={(e) => onAChange(e.target.value)} spellCheck={false} />
        </label>
        <label className="field">
          <span>Second word</span>
          <input value={b} onChange={(e) => onBChange(e.target.value)} spellCheck={false} />
        </label>
      </div>
      {comparison ? (
        <>
          <p className="big-score">
            <output>{comparison.similarity.toFixed(3)}</output> similarity
          </p>
          <h3>Closest to both</h3>
          <NeighbourList neighbours={comparison.between} onExplore={onExplore} />
        </>
      ) : (
        <p className="hint">Type two of the 20,000 most common words.</p>
      )}
    </Panel>
  )
}
