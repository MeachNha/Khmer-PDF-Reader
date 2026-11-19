export const canSpeak = () => 'speechSynthesis' in window
export function speak(text) {
  if (!canSpeak()) return
  speechSynthesis.cancel()
  const u = new SpeechSynthesisUtterance(text); u.lang = 'en-US'; u.rate = 0.9
  speechSynthesis.speak(u)
}
