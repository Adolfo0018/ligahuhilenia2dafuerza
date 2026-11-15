import { useState } from 'react'
import { iniciales } from '../lib/formato'
import { enlaceSeguro, LOGOS } from '../lib/publicidad'
import type { Anuncio } from '../types'

/** Logo del catálogo (src/assets/publicidad) o, si falta o no carga, las iniciales del negocio. */
export function LogoAnuncio({ anuncio, grande = false }: { anuncio: Pick<Anuncio, 'logo' | 'negocio'>; grande?: boolean }) {
  const url = anuncio.logo ? LOGOS.get(anuncio.logo) : undefined
  const [fallo, setFallo] = useState(false)
  const clase = grande ? 'anuncio-logo anuncio-logo-grande' : 'anuncio-logo'
  if (url && !fallo) {
    return <img className={clase} src={url} alt="" loading="lazy" decoding="async" width={grande ? 56 : 36} height={grande ? 56 : 36} onError={() => setFallo(true)} />
  }
  return (
    <span className={`${clase} anuncio-logo-iniciales`} aria-hidden="true">
      {iniciales(anuncio.negocio)}
    </span>
  )
}

const atributosEnlace = (url: string) =>
  url.startsWith('http') ? { target: '_blank', rel: 'noopener noreferrer sponsored' } : {}

/** Debajo del encabezado de la jornada, antes del primer partido. */
export function PatrocinadorOficial({ anuncio }: { anuncio: Anuncio }) {
  const url = enlaceSeguro(anuncio.enlace)
  return (
    <aside className="patrocinador tarjeta" aria-label="Patrocinador oficial de la jornada">
      <LogoAnuncio anuncio={anuncio} grande />
      <div className="patrocinador-texto">
        <span className="patrocinador-etiqueta">Patrocinador oficial de la jornada</span>
        <strong className="patrocinador-negocio">{anuncio.negocio}</strong>
        {anuncio.mensaje && <p className="patrocinador-mensaje">{anuncio.mensaje}</p>}
      </div>
      {url && (
        <a className="patrocinador-boton" href={url} {...atributosEnlace(url)}>
          {anuncio.textoBoton || 'Contactar'}
        </a>
      )}
    </aside>
  )
}

/** Después de los partidos, en tarjetas compactas. */
export function AnunciosRegulares({ anuncios }: { anuncios: Anuncio[] }) {
  if (!anuncios.length) return null
  return (
    <section className="anuncios" aria-label="Anunciantes de la jornada">
      <h3 className="anuncios-titulo">Anunciantes</h3>
      <ul className="anuncios-lista">
        {anuncios.map((a) => {
          const url = enlaceSeguro(a.enlace)
          const contenido = (
            <>
              <LogoAnuncio anuncio={a} />
              <span className="anuncio-texto">
                <strong>{a.negocio}</strong>
                {a.mensaje && <span>{a.mensaje}</span>}
              </span>
            </>
          )
          return (
            <li key={a.id}>
              {url ? (
                <a className="anuncio tarjeta" href={url} {...atributosEnlace(url)}>
                  {contenido}
                </a>
              ) : (
                <div className="anuncio tarjeta">{contenido}</div>
              )}
            </li>
          )
        })}
      </ul>
    </section>
  )
}
