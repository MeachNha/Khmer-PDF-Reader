import { useEffect, useRef, useState } from 'react'
import { TextLayer } from 'pdfjs-dist'
import 'pdfjs-dist/web/pdf_viewer.css'

// Renders one page: a canvas for looks + a real PDF.js text layer for selection.
export default function PDFPage({ pdf, n, scale, dim, onVisible, annotations = [] }) {
  const wrap = useRef(), canvas = useRef(), text = useRef()
  const [vis, setVis] = useState(false)

  useEffect(() => {
    const near = new IntersectionObserver(([e]) => setVis(e.isIntersecting), { rootMargin: '800px' })
    const mid = new IntersectionObserver(([e]) => e.isIntersecting && onVisible?.(n), { threshold: 0.5 })
    near.observe(wrap.current); mid.observe(wrap.current)
    return () => { near.disconnect(); mid.disconnect() }
  }, [n])

  useEffect(() => {
    if (!vis) return
    let task, tl, dead = false
    ;(async () => {
      const page = await pdf.getPage(n)
      const vp = page.getViewport({ scale }), r = window.devicePixelRatio || 1, c = canvas.current
      c.width = vp.width * r; c.height = vp.height * r
      c.style.width = vp.width + 'px'; c.style.height = vp.height + 'px'
      task = page.render({ canvasContext: c.getContext('2d'), viewport: vp, transform: r !== 1 ? [r, 0, 0, r, 0, 0] : null })
      await task.promise.catch(() => {})
      if (dead) return
      const t = text.current; t.innerHTML = ''; t.style.setProperty('--scale-factor', scale)
      tl = new TextLayer({ textContentSource: page.streamTextContent(), container: t, viewport: vp })
      await tl.render()
    })().catch(() => {})
    return () => { dead = true; task?.cancel(); tl?.cancel() }
  }, [vis, pdf, n, scale])

  return (
    <div ref={wrap} data-page={n} className="relative mx-auto mb-3 bg-white shadow-md"
      style={{ width: dim.w * scale, height: dim.h * scale }}>
      <canvas ref={canvas} />
      <div className="pointer-events-none absolute inset-0 z-[1]">
        {annotations.filter(a => a.kind === 'highlight').flatMap(a => (a.rects || []).map((r, i) => <span key={`${a.id}-${i}`} title={a.note || a.text} className="absolute rounded-sm" style={{ left: `${r.x * 100}%`, top: `${r.y * 100}%`, width: `${r.w * 100}%`, height: `${r.h * 100}%`, backgroundColor: { yellow: 'rgba(250,204,21,.38)', green: 'rgba(74,222,128,.35)', pink: 'rgba(244,114,182,.35)' }[a.color] || 'rgba(250,204,21,.38)' }} />))}
      </div>
      <div ref={text} className="textLayer" />
    </div>
  )
}
