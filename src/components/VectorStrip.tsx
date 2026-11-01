import type { Vector } from '../lib/vectors.ts'

/** Draws each number in a vector as a coloured cell, like a barcode for the word. */
export function VectorStrip({ vector }: { vector: Vector }) {
  return (
    <svg className="vector-strip" viewBox={`0 0 ${vector.length} 1`} preserveAspectRatio="none" aria-hidden="true">
      {Array.from(vector, (value, i) => (
        <rect
          key={i}
          x={i}
          width={1}
          height={1}
          className={value < 0 ? 'negative' : 'positive'}
          // GloVe values mostly sit between -2 and 2.
          opacity={Math.min(Math.abs(value) / 2, 1)}
        />
      ))}
    </svg>
  )
}
