import { getSettings } from './translationService'

// Edit this prompt to change the teaching style or response structure.
export const EXPLAIN_PROMPT = `You are a friendly English teacher for a Khmer speaker. Explain the selected English in a short, beginner-friendly way. Use plain text and simple headings. Output in this order: Meaning in simple English (1-2 sentences); Meaning in natural Khmer (not word-for-word); Important words/idioms with Khmer meaning; Short grammar or tone note only if useful; One simple example sentence with Khmer translation. CRITICAL LANGUAGE RULE: Every Khmer translation and Khmer meaning must be written in Cambodian Khmer language using Khmer script (Unicode U+1780-U+17FF). Never use Thai language, Thai words, or Thai script (Unicode U+0E00-U+0E7F). Do not substitute Thai for Khmer. English explanations may remain in English; all requested translations must be Khmer only.`

const providers = {
  async gemini({ text, context, apiKey, model, prompt = EXPLAIN_PROMPT }) {
    const r = await fetchWithTimeout(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey }, body: JSON.stringify({ contents: [{ parts: [{ text: `${prompt}\n\nSelected text: ${text}${context ? `\nContext: ${context}` : ''}` }] }] }) })
    return readResponse(r, j => j.candidates?.[0]?.content?.parts?.map(p => p.text).join('\n'))
  },
  async groq({ text, context, apiKey, model }) {
    return openAI('https://api.groq.com/openai/v1/chat/completions', { text, context, apiKey, model })
  },
  async openrouter({ text, context, apiKey, model }) {
    return openAI('https://openrouter.ai/api/v1/chat/completions', { text, context, apiKey, model })
  }
}
async function openAI(url, { text, context, apiKey, model, prompt = EXPLAIN_PROMPT }) {
  const r = await fetchWithTimeout(url, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` }, body: JSON.stringify({ model, messages: [{ role: 'system', content: prompt }, { role: 'user', content: `Selected text: ${text}${context ? `\nContext: ${context}` : ''}` }], temperature: 0.4 }) })
  return readResponse(r, j => j.choices?.[0]?.message?.content)
}
async function fetchWithTimeout(url, options) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 60000)
  try { return await fetch(url, { ...options, signal: controller.signal }) }
  catch (e) { if (e.name === 'AbortError') throw new Error('The AI provider took too long to respond. Check the provider/model and try again.'); throw e }
  finally { clearTimeout(timer) }
}
async function readResponse(r, extract) {
  const data = await r.json().catch(() => ({}))
  if (!r.ok) { const detail = data.error?.message; if (r.status === 401 || r.status === 403) throw new Error(`Invalid API key or access denied (401/403). ${detail || 'Check your provider settings.'}`); if (r.status === 429) throw new Error(`Rate limit reached. ${detail || 'Wait a little and try again.'}`); throw new Error(`AI request failed (${r.status}). ${detail || ''}`.trim()) }
  const value = extract(data)
  if (!value) throw new Error('The AI returned an empty explanation. Try again.')
  return value.trim()
}
const defaults = { gemini: 'gemini-3.8-flash', groq: 'openai/gpt-oss-120b', openrouter: 'meta-llama/llama-3.3-70b-instruct:free' }
export const defaultModel = provider => defaults[provider] || defaults.gemini
export const explanationCacheKey = (provider, model, text) => `explain:${provider}:${model}:${text.trim().toLowerCase()}`
export async function explain({ text, context = '', regenerate = false }) {
  const s = getSettings(), provider = s.aiProvider || 'gemini', model = s.aiModel || defaultModel(provider), apiKey = s.aiKey || ''
  if (!apiKey.trim()) throw new Error('Add an API key in Settings to use Explain.')
  if (!navigator.onLine) throw new Error('You are offline. AI explanations need internet.')
  const key = explanationCacheKey(provider, model, text)
  if (!regenerate) {
    const cached = localStorage.getItem(key)
    if (cached && !/[\u0E00-\u0E7F]/.test(cached)) return cached
    if (cached) localStorage.removeItem(key)
  }
  try {
    let result = await providers[provider]({ text, context, apiKey, model })
    if (/[\u0E00-\u0E7F]/.test(result)) {
      result = await providers[provider]({ text, context, apiKey, model, prompt: `${EXPLAIN_PROMPT}\n\nYour previous answer used Thai. Rewrite the whole answer now. Remove all Thai words and Thai script. Every translation must be in Khmer language and Khmer script only.` })
      if (/[\u0E00-\u0E7F]/.test(result)) throw new Error('The AI kept returning Thai text. Please regenerate or try another model; no Thai response was saved.')
    }
    localStorage.setItem(key, result)
    return result
  } catch (e) { if (e instanceof TypeError) throw new Error('Network failure. Check your connection and try again.'); throw e }
}
export async function testAIConnection() {
  const s = getSettings(), provider = s.aiProvider || 'gemini', model = s.aiModel || defaultModel(provider), apiKey = s.aiKey || ''
  if (!apiKey.trim()) throw new Error('Add an API key in Settings to use Explain.')
  if (!navigator.onLine) throw new Error('You are offline. AI explanations need internet.')
  return providers[provider]({ text: 'Reply with OK only.', apiKey, model, prompt: 'Reply with OK only.' })
}
export function clearExplanationCache() { Object.keys(localStorage).filter(k => k.startsWith('explain:')).forEach(k => localStorage.removeItem(k)) }
