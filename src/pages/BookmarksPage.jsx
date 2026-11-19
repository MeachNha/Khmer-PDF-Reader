import { useEffect, useState } from 'react'
import { Trash2 } from 'lucide-react'
import { dbAll, dbDel, dbGet, dbPut } from '../db/indexedDB'

export default function BookmarksPage({ onOpen }) {
  const [items, setItems] = useState([])
  const load = async () => setItems((await dbAll('bookmarks')).sort((a, b) => b.date - a.date))
  useEffect(() => { load() }, [])
  const open = async (b) => { const m = await dbGet('books', b.bookId); if (m) { await dbPut('books', { ...m, page: b.page }); onOpen(b.bookId) } else alert('Book was deleted.') }
  return (
    <div className="space-y-3 p-4">
      {!items.length && <p className="mt-20 text-center text-slate-400">No bookmarks yet.</p>}
      {items.map(b => (
        <div key={b.id} className="flex items-center rounded-2xl bg-white p-4 shadow-sm">
          <button className="flex-1 text-left" onClick={() => open(b)}>
            <div className="font-semibold">{b.book} · page {b.page}</div>
            {b.note && <div className="text-sm text-slate-600">{b.note}</div>}
            <div className="text-xs text-slate-400">{new Date(b.date).toLocaleString()}</div>
          </button>
          <button className="p-2 text-red-500" onClick={async () => { await dbDel('bookmarks', b.id); load() }}><Trash2 size={18} /></button>
        </div>))}
    </div>
  )
}
