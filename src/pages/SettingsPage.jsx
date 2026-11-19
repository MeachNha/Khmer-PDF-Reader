import { useState } from 'react'
import { getSettings, saveSettings, clearCache } from '../services/translationService'
import { clearExplanationCache, defaultModel, testAIConnection } from '../services/aiService'

const links = { gemini: ['Google AI Studio', 'https://aistudio.google.com/app/apikey'], groq: ['Groq console', 'https://console.groq.com/keys'], openrouter: ['OpenRouter', 'https://openrouter.ai/keys'] }
export default function SettingsPage() {
  const [s, setS] = useState(() => {
    const current = getSettings()
    if (current.aiProvider === 'groq' && current.aiModel === 'llama-3.3-70b-versatile') {
      const migrated = { ...current, aiModel: defaultModel('groq') }
      saveSettings(migrated)
      return migrated
    }
    return current
  }), [ok, setOk] = useState(''), [showKey, setShowKey] = useState(false), [testing, setTesting] = useState(false)
  const set = p => { const n = { ...s, ...p }; setS(n); saveSettings(n) }
  const provider = s.aiProvider || 'gemini', field = 'w-full rounded-xl border bg-white p-3'
  const test = async () => { setTesting(true); setOk('Testing…'); try { await testAIConnection(); setOk('Connection successful.') } catch (e) { setOk(e.message) } finally { setTesting(false) } }
  return <div className="mx-auto max-w-xl space-y-5 p-4"><h1 className="text-xl font-semibold">Settings</h1>
    <section className="space-y-3 rounded-2xl bg-white p-4 shadow-sm"><h2 className="font-semibold">AI explanations</h2><label className="block"><span className="text-sm text-slate-500">Provider</span><select className={field} value={provider} onChange={e => { const aiProvider = e.target.value; set({ aiProvider, aiModel: defaultModel(aiProvider) }) }}><option value="gemini">Gemini (Google AI Studio)</option><option value="groq">Groq</option><option value="openrouter">OpenRouter</option></select></label>
      <label className="block"><span className="text-sm text-slate-500">API key</span><div className="flex gap-2"><input className={field} type={showKey ? 'text' : 'password'} autoComplete="off" value={s.aiKey || ''} onChange={e => set({ aiKey: e.target.value })} placeholder="Paste your key" /><button className="rounded-xl border px-3" onClick={() => setShowKey(x => !x)}>{showKey ? 'Hide' : 'Show'}</button></div></label>
      <label className="block"><span className="text-sm text-slate-500">Model name</span><input className={field} value={s.aiModel || defaultModel(provider)} onChange={e => set({ aiModel: e.target.value })} /></label>
      <div className="text-sm text-slate-500">Get a free key: <a className="text-indigo-600 underline" href={links[provider][1]} target="_blank" rel="noreferrer">{links[provider][0]}</a>. Free-tier limits can change. Your key is stored only on this device.</div>
      <div className="flex flex-wrap gap-2"><button disabled={testing} className="rounded-full bg-indigo-600 px-4 py-2 text-white disabled:opacity-50" onClick={test}>{testing ? 'Testing…' : 'Test connection'}</button><button className="rounded-full bg-slate-100 px-4 py-2" onClick={() => { clearExplanationCache(); setOk('Explanation cache cleared.') }}>Clear explanation cache</button></div>{ok && <p className="text-sm text-slate-600">{ok}</p>}
    </section>
    <section className="space-y-3 rounded-2xl bg-white p-4 shadow-sm"><label className="block"><span className="text-sm text-slate-500">Translation provider (English → Khmer)</span><select className={field} value={s.provider} onChange={e => set({ provider: e.target.value })}><option value="mymemory">MyMemory (free, default)</option><option value="libre">LibreTranslate (custom URL)</option></select></label>{s.provider === 'libre' && <label className="block"><span className="text-sm text-slate-500">LibreTranslate URL</span><input className={field} value={s.libreUrl} onChange={e => set({ libreUrl: e.target.value })} /></label>}<label className="block"><span className="text-sm text-slate-500">Reading background</span><select className={field} value={s.theme} onChange={e => set({ theme: e.target.value })}><option value="white">White</option><option value="cream">Warm cream</option><option value="dark">Dark</option></select></label><button className="rounded-full bg-slate-800 px-5 py-2 text-white" onClick={() => { clearCache(); setOk('Translation cache cleared.') }}>Clear translation cache</button></section>
  </div>
}
