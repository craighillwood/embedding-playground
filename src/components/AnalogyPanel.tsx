import type { AnalogyResult } from '../lib/analogy.ts'
import { NeighbourList } from './NeighbourList.tsx'
import { Panel } from './Panel.tsx'

const EXAMPLES = ['king - man + woman', 'paris - france + italy', 'paris - france + japan', 'walking - walk + swim']

interface AnalogyPanelProps {
  active: boolean
  onActivate: () => void
  expression: string
  onExpressionChange: (expression: string) => void
  result: AnalogyResult
  onExplore: (word: string) => void
}

export function AnalogyPanel(props: AnalogyPanelProps) {
  const { expression, onExpressionChange, result, onExplore } = props

  return (
    <Panel
      title="Word arithmetic"
      description="Add and subtract word vectors, then find the nearest word to where you land (leaving out the words you typed)."
      active={props.active}
      onActivate={props.onActivate}
    >
      <label className="field">
        <span>Expression</span>
        <input value={expression} onChange={(e) => onExpressionChange(e.target.value)} spellCheck={false} />
      </label>
      <p className="examples">
        Try:{' '}
        {EXAMPLES.map((example) => (
          <button key={example} type="button" className="chip" onClick={() => onExpressionChange(example)}>
            {example}
          </button>
        ))}
      </p>
      {result.kind === 'ok' && <NeighbourList neighbours={result.neighbours} onExplore={onExplore} highlightFirst />}
      {result.kind === 'unknown-words' && (
        <p className="hint">Not in the vocabulary: {result.words.map((w) => `“${w}”`).join(', ')}</p>
      )}
    </Panel>
  )
}
