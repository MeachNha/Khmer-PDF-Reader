import { useEffect, useState } from 'react'
import { Library, Languages, Bookmark, Settings, WifiOff, Quote } from 'lucide-react'
import LibraryPage from './pages/LibraryPage'
import ReaderPage from './pages/ReaderPage'
import VocabularyPage from './pages/VocabularyPage'
import BookmarksPage from './pages/BookmarksPage'
import SettingsPage from './pages/SettingsPage'
import QuotesPage from './pages/QuotesPage'

const TABS = [['library', 'Library', Library], ['vocab', 'Vocabulary', Languages], ['quotes', 'Quotes', Quote], ['bookmarks', 'Bookmarks', Bookmark], ['settings', 'Settings', Settings]]

export default function App() {
  const [tab, setTab] = useState('library'), [reading, setReading] = useState(null), [online, setOnline] = useState(navigator.onLine)
  useEffect(() => {
    const on = () => setOnline(true), off = () => setOnline(false)
    addEventListener('online', on); addEventListener('offline', off)
    return () => { removeEventListener('online', on); removeEventListener('offline', off) }
  }, [])
  if (reading) return <ReaderPage key={typeof reading === 'string' ? reading : reading.id} bookId={typeof reading === 'string' ? reading : reading.id} initialPage={typeof reading === 'string' ? undefined : reading.page} onBack={() => setReading(null)} onSettings={() => { setReading(null); setTab('settings') }} />
  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 md:pl-52">
      <nav className="fixed bottom-0 left-0 right-0 z-40 flex justify-around border-t bg-white pb-[env(safe-area-inset-bottom)] md:inset-y-0 md:right-auto md:w-52 md:flex-col md:justify-start md:gap-1 md:border-r md:border-t-0 md:p-3">
        <div className="mb-4 hidden px-3 pt-2 text-lg font-bold text-indigo-600 md:block">Khmer Reader</div>
        {TABS.map(([k, label, Icon]) => (
          <button key={k} onClick={() => setTab(k)}
            className={`flex flex-col items-center gap-0.5 px-3 py-2 text-xs md:flex-row md:gap-3 md:rounded-xl md:text-sm ${tab === k ? 'text-indigo-600 md:bg-indigo-50' : 'text-slate-500'}`}>
            <Icon size={22} />{label}</button>))}
      </nav>
      {!online && <div className="flex items-center justify-center gap-2 bg-amber-100 py-1 text-sm text-amber-800"><WifiOff size={14} />Offline: reading works, translation needs internet</div>}
      <main className="pb-20 md:pb-4">
        {tab === 'library' && <LibraryPage onOpen={setReading} />}
        {tab === 'vocab' && <VocabularyPage />}
        {tab === 'bookmarks' && <BookmarksPage onOpen={setReading} />}
        {tab === 'quotes' && <QuotesPage onOpen={(id, page) => setReading({ id, page })} />}
        {tab === 'settings' && <SettingsPage />}
      </main>
    </div>
  )
}
