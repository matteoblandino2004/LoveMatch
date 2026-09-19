import type { Compatibility } from '../lib/compatibility'
import { scoreLabel } from '../lib/compatibility'

export function ScoreRing({ score, caption }: { score: number; caption?: string }) {
  return (
    <div className="big-score">
      <div className="ring" style={{ ['--pct' as string]: score }}>
        <b>{score}</b>
      </div>
      <div>
        <div style={{ fontWeight: 750, fontSize: 16 }}>{scoreLabel(score)}</div>
        <div className="muted tiny">{caption ?? 'Compatibility across six things that matter'}</div>
      </div>
    </div>
  )
}

export function FacetList({ compat }: { compat: Compatibility }) {
  return (
    <div>
      {compat.facets.map((f) => (
        <div className="facet" key={f.key}>
          <div className="facet-head">
            <b>{f.label}</b>
            <span>
              {Math.round(f.score * f.weight)} / {f.weight}
            </span>
          </div>
          <div className="meter">
            <i style={{ width: `${Math.max(2, f.score * 100)}%` }} />
          </div>
          <div className="facet-detail">{f.detail}</div>
        </div>
      ))}
    </div>
  )
}
