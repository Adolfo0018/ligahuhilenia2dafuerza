import type { Resultado } from '../lib/partidos'

const NOMBRES: Record<Resultado, string> = { G: 'ganó', E: 'empató', P: 'perdió' }

export function Racha({ resultados }: { resultados: Resultado[] }) {
  if (!resultados.length) return <span className="texto-suave">–</span>
  return (
    <span className="racha" role="img" aria-label={`Últimos resultados: ${resultados.map((r) => NOMBRES[r]).join(', ')}`}>
      {resultados.map((r, i) => (
        <span key={i} className={`racha-${r}`}>
          {r}
        </span>
      ))}
    </span>
  )
}
