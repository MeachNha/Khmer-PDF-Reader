import { useEffect, useRef, useState } from 'react'
import * as pdfjs from 'pdfjs-dist'
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url'
import { Plus, Trash2, Search, BookOpen } from 'lucide-react'
import { dbAll, dbPut, dbDel, uid } from '../db/indexedDB'
pdfjs.GlobalWorkerOptions.workerSrc = workerUrl

async function makeCover(buf) {
  const doc = await pdfjs.getDocument({ data: buf.slice(0) }).promise
  const p = await doc.getPage(1), vp = p.getViewport({ scale: 0.4 }), c = document.createElement('canvas')
  c.width = vp.width; c.height = vp.height
  await p.render({ canvasContext: c.getContext('2d'), viewport: vp }).promise
  return { cover: c.toDataURL('image/jpeg', 0.7), total: doc.numPages }
}

export default function LibraryPage({ onOpen }) {
  const [books, setBooks] = useState([]), [q, setQ] = useState(''), [busy, setBusy] = useState(false)
  const input = useRef()
  const load = async () => setBooks((await dbAll('books')).sort((a, b) => (b.lastRead || b.added) - (a.lastRead || a.added)))
  useEffect(() => { load() }, [])

  const add = async (e) => {
    setBusy(true)
    for (const f of e.target.files) {
      try {
        const id = uid(), buf = await f.arrayBuffer(), { cover, total } = await makeCover(buf)
        await dbPut('files', { id, blob: new Blob([buf], { type: 'application/pdf' }) })
        await dbPut('books', { id, name: f.name.replace(/\.pdf$/i, ''), size: f.size, cover, total, page: 1, added: Date.now() })
      } catch { alert(`Could not import ${f.name}`) }
    }
    e.target.value = ''; setBusy(false); load()
  }
  const del = async (b) => {
    if (!confirm(`Delete "${b.name}"?`)) return
    await dbDel('books', b.id); await dbDel('files', b.id); load()
  }
  const list = books.filter(b => b.name.toLowerCase().includes(q.toLowerCase()))
  return (
    <div className="p-4">
      <div className="mb-4 flex gap-2">
        <div className="flex flex-1 items-center gap-2 rounded-full bg-white px-4 py-2 shadow-sm">
          <Search size={18} className="text-slate-400" />
          <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search books" className="flex-1 outline-none" />
        </div>
        <button onClick={() => input.current.click()} className="flex items-center gap-1 rounded-full bg-indigo-600 px-4 text-white shadow">
          <Plus size={18} />{busy ? '…' : 'Import'}</button>
        <input ref={input} type="file" accept="application/pdf" multiple hidden onChange={add} />
      </div>
      {!list.length && <div className="mt-20 text-center text-slate-400"><BookOpen className="mx-auto mb-2" size={40} />No books yet. Import a PDF to start.</div>}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        {list.map(b => (
          <div key={b.id} className="overflow-hidden rounded-2xl bg-white shadow-md">
            <button onClick={() => onOpen(b.id)} className="block w-full text-left">
              <img src={b.cover} alt="" className="h-44 w-full bg-slate-100 object-cover object-top" />
              <div className="p-3">
                <div className="truncate text-sm font-semibold">{b.name}</div>
                <div className="text-xs text-slate-500">{(b.size / 1048576).toFixed(1)} MB · page {b.page}/{b.total}</div>
                <div className="mt-2 h-1 rounded bg-slate-100"><div className="h-full rounded bg-indigo-500" style={{ width: `${(b.page / b.total) * 100}%` }} /></div>
              </div>
            </button>
            <button onClick={() => del(b)} className="flex w-full items-center justify-center gap-1 border-t py-2 text-xs text-red-500"><Trash2 size={14} />Delete</button>
          </div>))}
      </div>
    </div>
  )
}
