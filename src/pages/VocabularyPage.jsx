import { useEffect, useState } from 'react'
import { Search, Volume2, Copy, Pencil, Trash2, Download } from 'lucide-react'
import { dbAll, dbPut, dbDel } from '../db/indexedDB'
import { speak, canSpeak } from '../services/speechService'

export default function VocabularyPage() {
  const [items, setItems] = useState([]), [q, setQ] = useState(''), [book, setBook] = useState(''), [expanded, setExpanded] = useState({})
  const load = async () => setItems((await dbAll('vocab')).sort((a, b) => b.date - a.date))
  useEffect(() => { load() }, [])
  const books = [...new Set(items.map(i => i.book))]
  const shown = items.filter(i => (!book || i.book === book) && (i.text.toLowerCase().includes(q.toLowerCase()) || i.km.includes(q)))

  const edit = async (i) => { const km = prompt('Edit Khmer translation', i.km); if (km) { await dbPut('vocab', { ...i, km }); load() } }
  const del = async (i) => { if (confirm('Delete this word?')) { await dbDel('vocab', i.id); load() } }
  const csv = () => {
    const esc = s => `"${String(s).replace(/"/g, '""')}"`
    const rows = [['English', 'Khmer', 'Book', 'Page', 'Date'], ...shown.map(i => [i.text, i.km, i.book, i.page, new Date(i.date).toISOString()])]
    const url = URL.createObjectURL(new Blob(['\ufeff' + rows.map(r => r.map(esc).join(',')).join('\n')], { type: 'text/csv;charset=utf-8' }))
    Object.assign(document.createElement('a'), { href: url, download: 'vocabulary.csv' }).click()
  }
  const ib = 'p-2 text-slate-500 active:text-indigo-600'
  return (
    <div className="p-4">
      <div className="mb-4 flex flex-wrap gap-2">
        <div className="flex min-w-[10rem] flex-1 items-center gap-2 rounded-full bg-white px-4 py-2 shadow-sm">
          <Search size={18} className="text-slate-400" />
          <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search English or Khmer" className="flex-1 outline-none" />
        </div>
        <select value={book} onChange={e => setBook(e.target.value)} className="max-w-[10rem] rounded-full bg-white px-3 shadow-sm">
          <option value="">All books</option>{books.map(b => <option key={b}>{b}</option>)}</select>
        <button onClick={csv} disabled={!shown.length} className="flex items-center gap-1 rounded-full bg-indigo-600 px-4 text-white"><Download size={16} />CSV</button>
      </div>
      {!shown.length && <p className="mt-20 text-center text-slate-400">No saved words yet. Select text in a book and tap Save.</p>}
      <div className="space-y-3">
        {shown.map(i => (
          <div key={i.id} className="rounded-2xl bg-white p-4 shadow-sm">
            <div className="font-semibold">{i.text}</div>
            <div className="text-lg text-indigo-700">{i.km}</div>
            {i.explanation && <><button className="text-sm text-indigo-600" onClick={() => setExpanded(x => ({ ...x, [i.id]: !x[i.id] }))}>{expanded[i.id] ? 'Hide explanation' : 'Show explanation'}</button>{expanded[i.id] && <p className="whitespace-pre-wrap rounded-lg bg-slate-50 p-3 text-sm">{i.explanation}</p>}</>}
            <div className="text-xs text-slate-400">{i.book} · p.{i.page} · {new Date(i.date).toLocaleDateString()}</div>
            <div className="mt-1 flex">
              {canSpeak() && <button className={ib} onClick={() => speak(i.text)}><Volume2 size={18} /></button>}
              <button className={ib} onClick={() => navigator.clipboard?.writeText(`${i.text} - ${i.km}`)}><Copy size={18} /></button>
              <button className={ib} onClick={() => edit(i)}><Pencil size={18} /></button>
              <button className={ib + ' ml-auto'} onClick={() => del(i)}><Trash2 size={18} /></button>
            </div>
          </div>))}
      </div>
    </div>
  )
}
