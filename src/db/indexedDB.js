// Tiny IndexedDB wrapper. Stores: books (metadata), files (PDF blobs), vocab, bookmarks
const STORES = ['books', 'files', 'vocab', 'bookmarks', 'quotes', 'annotations']
let dbp
const open = () => dbp ||= new Promise((res, rej) => {
  const r = indexedDB.open('khmer-reader', 3)
  r.onupgradeneeded = () => STORES.forEach(s => { if (!r.result.objectStoreNames.contains(s)) r.result.createObjectStore(s, { keyPath: 'id' }) })
  r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error)
})
const run = async (store, mode, fn) => {
  const db = await open()
  return new Promise((res, rej) => {
    const req = fn(db.transaction(store, mode).objectStore(store))
    req.onsuccess = () => res(req.result); req.onerror = () => rej(req.error)
  })
}
export const dbPut = (s, v) => run(s, 'readwrite', o => o.put(v))
export const dbGet = (s, id) => run(s, 'readonly', o => o.get(id))
export const dbAll = (s) => run(s, 'readonly', o => o.getAll())
export const dbDel = (s, id) => run(s, 'readwrite', o => o.delete(id))
export const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7)
