import { ref, onUnmounted } from 'vue'
import { useSettingsStore } from '@/stores/settings'
import { requestTTS, fetchNewestAudio } from '@/services/speechApi'

export function useVoiceTTS() {
  const settings = useSettingsStore()
  const isPlaying = ref(false)
  let audio: HTMLAudioElement | null = null
  let objectUrl: string | null = null

  async function playText(text: string) {
    if (!text || isPlaying.value || !settings.isVoiceReadingEnabled) return

    isPlaying.value = true

    try {
      const ttsResult = await requestTTS(text)
      if (!ttsResult.success) {
        console.error('[VoiceTTS] TTS request failed:', ttsResult.error)
        isPlaying.value = false
        return
      }

      const audioResult = await fetchNewestAudio()
      if (!audioResult.success || !audioResult.data) {
        console.error('[VoiceTTS] Audio fetch failed:', audioResult.error)
        isPlaying.value = false
        return
      }

      if (objectUrl) URL.revokeObjectURL(objectUrl)
      objectUrl = URL.createObjectURL(audioResult.data)

      audio = new Audio(objectUrl)
      audio.onended = () => {
        isPlaying.value = false
        if (objectUrl) { URL.revokeObjectURL(objectUrl); objectUrl = null }
      }
      audio.onerror = () => {
        isPlaying.value = false
        if (objectUrl) { URL.revokeObjectURL(objectUrl); objectUrl = null }
      }
      await audio.play()
    } catch (err) {
      console.error('[VoiceTTS] Playback failed:', err)
      isPlaying.value = false
    }
  }

  function stop() {
    if (audio) {
      audio.pause()
      audio.currentTime = 0
    }
    isPlaying.value = false
    if (objectUrl) { URL.revokeObjectURL(objectUrl); objectUrl = null }
  }

  onUnmounted(() => {
    stop()
  })

  return {
    isPlaying,
    playText,
    stop,
  }
}
