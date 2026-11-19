import { useEffect, useRef, useState, useCallback } from 'react'
import * as pdfjs from 'pdfjs-dist'
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url'
import { ArrowLeft, ZoomIn, ZoomOut, Bookmark, Palette, Rows3, Square, ChevronLeft, ChevronRight, StickyNote, Trash2 } from 'lucide-react'
import PDFPage from '../components/PDFPage'
import TranslationPopup from '../components/TranslationPopup'
import { dbGet, dbPut, dbAll, uid } from '../db/indexedDB'
import { getSettings, saveSettings } from '../services/translationService'
pdfjs.GlobalWorkerOptions.workerSrc = workerUrl

const BG = { white: 'bg-slate-200', cream: 'bg-amber-100', dark: 'bg-neutral-900' }

export default function ReaderPage({ bookId, initialPage, onBack, onSettings }) {
  const [book, setBook] = useState(), [pdf, setPdf] = useState(), [dim, setDim] = useState()
  const [page, setPage] = useState(1), [zoom, setZoom] = useState(1), [single, setSingle] = useState(false)
  const [theme, setTheme] = useState(getSettings().theme), [sel, setSel] = useState(), [width, setWidth] = useState(360)
  const [scanned, setScanned] = useState(false), [msg, setMsg] = useState(''), [err, setErr] = useState(''), [annotations, setAnnotations] = useState([]), [showNotes, setShowNotes] = useState(false)
  const scroller = useRef(), timer = useRef()

  useEffect(() => {
    (async () => {
      try {
        const meta = await dbGet('books', bookId), file = await dbGet('files', bookId)
        const doc = await pdfjs.getDocument({ data: await file.blob.arrayBuffer() }).promise
        const p1 = await doc.getPage(1), vp = p1.getViewport({ scale: 1 })
        let chars = 0
        for (let i = 1; i <= Math.min(3, doc.numPages); i++)
          chars += (await (await doc.getPage(i)).getTextContent()).items.length
        setScanned(chars === 0)
        setBook(meta); setPdf(doc); setDim({ w: vp.width, h: vp.height }); setPage(initialPage || meta.page || 1)
        setAnnotations((await dbAll('annotations')).filter(a => a.bookId === bookId).sort((a, b) => b.date - a.date))
      } catch { setErr('Could not open this PDF.') }
    })()
  }, [bookId])

  useEffect(() => {
    const f = () => setWidth(scroller.current?.clientWidth || 360)
    f(); addEventListener('resize', f); return () => removeEventListener('resize', f)
  }, [pdf])

  const scale = dim ? ((width - 16) / dim.w) * zoom : 1

  // Jump to saved page once, in continuous mode
  const jumped = useRef(false)
  useEffect(() => {
    if (!pdf || !dim || single || jumped.current) return
    jumped.current = true
    setTimeout(() => scroller.current.querySelector(`[data-page="${page}"]`)?.scrollIntoView(), 100)
  }, [pdf, dim])

  const goTo = (n) => {
    n = Math.max(1, Math.min(pdf.numPages, n)); setPage(n)
    if (!single) scroller.current.querySelector(`[data-page="${n}"]`)?.scrollIntoView({ behavior: 'smooth' })
  }

  // Save reading position (history)
  useEffect(() => { if (book) dbPut('books', { ...book, page, total: pdf?.numPages, lastRead: Date.now() }) }, [page])

  // Selection detection (mouse + touch both fire selectionchange)
  const check = useCallback(() => {
    clearTimeout(timer.current)
    timer.current = setTimeout(() => {
      const s = getSelection(); const text = s?.toString().trim().replace(/\s+/g, ' ')
      if (!text || text.length > 400 || !s.rangeCount) return
      const node = s.anchorNode?.parentElement?.closest('[data-page]')
      if (!node) return
      const anchor = s.anchorNode?.parentElement
      const layer = anchor?.closest('.textLayer')
      const spans = [...(layer?.querySelectorAll('span') || [])]
      const lineTop = anchor?.getBoundingClientRect().top
      const nearby = spans.filter(el => Math.abs(el.getBoundingClientRect().top - lineTop) < 90).map(el => el.textContent)
      const context = (nearby.join(' ') || node.innerText || text).replace(/\s+/g, ' ').slice(0, 500)
      const range = s.getRangeAt(0), pageRect = node.getBoundingClientRect()
      const rects = [...range.getClientRects()].map(r => ({ x: Math.max(0, (r.left - pageRect.left) / pageRect.width), y: Math.max(0, (r.top - pageRect.top) / pageRect.height), w: Math.min(1, r.width / pageRect.width), h: Math.min(1, r.height / pageRect.height) }))
      setSel({ text, context, rect: range.getBoundingClientRect(), rects, page: +node.dataset.page })
    }, 450)
  }, [])
  useEffect(() => {
    document.addEventListener('selectionchange', check)
    return () => document.removeEventListener('selectionchange', check)
  }, [check])

  const saveWord = async (km, explanation = '', note = '') => {
    const all = await dbAll('vocab'), key = sel.text.toLowerCase()
    const dup = all.find(v => v.text.toLowerCase() === key && v.bookId === bookId)
    await dbPut('vocab', dup ? { ...dup, km, explanation, note } : { id: uid(), text: sel.text, km, explanation, note, bookId, book: book.name, page: sel.page, date: Date.now() })
  }
  const saveQuote = async ({ km, explanation, note }) => {
    const all = await dbAll('quotes')
    if (all.some(q => q.text === sel.text && q.bookId === bookId)) return false
    await dbPut('quotes', { id: uid(), text: sel.text, km, explanation, note, book: book.name, bookId, page: sel.page, date: Date.now() })
    return true
  }
  const saveAnnotation = async (kind, note, color = 'yellow') => {
    const rec = { id: uid(), kind, text: sel.text, note, color, rects: sel.rects, bookId, book: book.name, page: sel.page, date: Date.now() }
    await dbPut('annotations', rec)
    setAnnotations(items => [rec, ...items])
    setMsg(kind === 'highlight' ? 'Highlight saved' : 'Note saved'); setTimeout(() => setMsg(''), 1400)
  }
  const deleteAnnotation = async item => { await dbDel('annotations', item.id); setAnnotations(items => items.filter(a => a.id !== item.id)) }
  const addBookmark = async () => {
    const note = prompt('Add a note (optional)') ?? ''
    await dbPut('bookmarks', { id: uid(), bookId, book: book.name, page, note, date: Date.now() })
    setMsg('Bookmarked page ' + page); setTimeout(() => setMsg(''), 1500)
  }
  const cycle = () => {
    const n = { white: 'cream', cream: 'dark', dark: 'white' }[theme]; setTheme(n); saveSettings({ ...getSettings(), theme: n })
  }
  const ib = 'p-2 rounded-full active:bg-black/10'
  const dark = theme === 'dark'

  if (err) return <div className="p-6">{err} <button className="underline" onClick={onBack}>Back</button></div>
  return (
    <div className={`fixed inset-0 flex flex-col ${BG[theme]} ${dark ? 'text-white pdf-dark' : 'text-slate-800'}`}>
      <div className={`flex items-center gap-1 px-2 py-1 shadow ${dark ? 'bg-neutral-800' : 'bg-white/90'}`}>
        <button className={ib} onClick={onBack}><ArrowLeft size={20} /></button>
        <div className="mx-1 min-w-0 flex-1 truncate text-sm font-medium">{book?.name}</div>
        <input type="number" value={page} onChange={e => goTo(+e.target.value)}
          className="w-12 rounded border bg-transparent px-1 text-center text-sm" />
        <span className="text-xs">/ {pdf?.numPages}</span>
        <button className={ib} onClick={() => setZoom(z => Math.max(.5, z - .2))}><ZoomOut size={18} /></button>
        <button className={ib} onClick={() => setZoom(z => Math.min(3, z + .2))}><ZoomIn size={18} /></button>
        <button className={ib} onClick={() => setSingle(s => !s)}>{single ? <Square size={18} /> : <Rows3 size={18} />}</button>
        <button className={ib} onClick={cycle}><Palette size={18} /></button>
        <button className={ib} aria-label="Notes and highlights" onClick={() => setShowNotes(v => !v)}><StickyNote size={18} /></button>
        <button className={ib} onClick={addBookmark}><Bookmark size={18} /></button>
      </div>
      {scanned && <div className="bg-amber-200 p-2 text-center text-sm text-amber-900">This PDF looks scanned (no selectable text). It needs OCR, which isn't supported.</div>}
      <div ref={scroller} className="flex-1 overflow-auto p-2">
        {!pdf && <div className="p-8 text-center">Loading…</div>}
        {pdf && (single
          ? <PDFPage key={page + '-' + scale} pdf={pdf} n={page} scale={scale} dim={dim} annotations={annotations.filter(a => a.page === page)} />
          : Array.from({ length: pdf.numPages }, (_, i) =>
              <PDFPage key={i} pdf={pdf} n={i + 1} scale={scale} dim={dim} onVisible={setPage} annotations={annotations.filter(a => a.page === i + 1)} />))}
      </div>
      {single && pdf && <div className="flex justify-center gap-6 bg-white/90 p-1 text-slate-800">
        <button className={ib} onClick={() => goTo(page - 1)}><ChevronLeft /></button>
        <button className={ib} onClick={() => goTo(page + 1)}><ChevronRight /></button></div>}
      {pdf && <div className="h-1 bg-black/10"><div className="h-full bg-indigo-500" style={{ width: `${(page / pdf.numPages) * 100}%` }} /></div>}
      {msg && <div className="fixed bottom-8 left-1/2 -translate-x-1/2 rounded-full bg-slate-900 px-4 py-2 text-sm text-white">{msg}</div>}
      {showNotes && <div className="fixed right-3 top-14 z-40 max-h-[70vh] w-[min(92vw,24rem)] overflow-y-auto rounded-2xl bg-white p-4 text-slate-800 shadow-xl"><div className="mb-3 flex items-center justify-between font-semibold">Notes & highlights <button onClick={() => setShowNotes(false)} className="px-2 text-xl">×</button></div>{!annotations.length && <p className="text-sm text-slate-500">Select text, then save a note or highlight.</p>}{annotations.map(a => <div key={a.id} className="mb-2 rounded-xl bg-slate-50 p-3"><div className="text-xs text-slate-400">{a.kind === 'highlight' ? `${a.color} highlight` : 'Note'} · page {a.page}</div><div className="text-sm font-medium">{a.text}</div>{a.note && <div className="mt-1 whitespace-pre-wrap text-sm text-slate-600">{a.note}</div>}<button className="mt-1 text-xs text-red-600" onClick={() => deleteAnnotation(a)}><Trash2 size={13} className="mr-1 inline" />Delete</button></div>)}</div>}
      {sel && <TranslationPopup sel={sel} onSave={saveWord} onQuote={saveQuote} onHighlight={(color, note) => saveAnnotation('highlight', note, color)} onNote={note => saveAnnotation('note', note)} onSettings={onSettings} onClose={() => { setSel(null); getSelection()?.removeAllRanges() }} />}
    </div>
  )
}
