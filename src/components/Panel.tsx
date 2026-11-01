import type { ReactNode } from 'react'

interface PanelProps {
  title: string
  description: ReactNode
  /** The active panel is the one whose words are shown on the plot. */
  active: boolean
  onActivate: () => void
  children: ReactNode
}

export function Panel({ title, description, active, onActivate, children }: PanelProps) {
  return (
    <section className={active ? 'panel active' : 'panel'} onFocus={onActivate}>
      <h2>{title}</h2>
      <p className="panel-description">{description}</p>
      {children}
    </section>
  )
}
