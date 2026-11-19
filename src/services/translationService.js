// Swap providers by editing `providers`. Settings live in localStorage.
export const getSettings = () => ({ provider: 'mymemory', libreUrl: 'https://libretranslate.com', theme: 'cream', ...JSON.parse(localStorage.getItem('settings') || '{}') })
export const saveSettings = (s) => localStorage.setItem('settings', JSON.stringify(s))
const cacheGet = () => JSON.parse(localStorage.getItem('tcache') || '{}')
export const clearCache = () => localStorage.removeItem('tcache')

const providers = {
  async mymemory(text) {
    const r = await fetch(`https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=en|km`)
    if (r.status === 429) throw new Error('Rate limit reached. Try again later.')
    const j = await r.json()
    if (j.responseStatus !== 200) throw new Error(j.responseDetails || 'Translation failed')
    return j.responseData.translatedText
  },
  async libre(text) {
    const r = await fetch(getSettings().libreUrl.replace(/\/$/, '') + '/translate', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ q: text, source: 'en', target: 'km', format: 'text' }) })
    if (!r.ok) throw new Error('LibreTranslate error ' + r.status)
    return (await r.json()).translatedText
  }
}
export async function translate(text) {
  const key = text.toLowerCase(), cache = cacheGet()
  if (cache[key]) return cache[key]
  if (!navigator.onLine) throw new Error('You are offline. Translation needs internet.')
  try {
    const out = await providers[getSettings().provider === 'libre' ? 'libre' : 'mymemory'](text)
    cache[key] = out
    const keys = Object.keys(cache); if (keys.length > 2000) delete cache[keys[0]]
    localStorage.setItem('tcache', JSON.stringify(cache))
    return out
  } catch (e) {
    throw new Error(e instanceof TypeError ? 'Network problem. Check your connection.' : e.message)
  }
}
