const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'

export async function transcribeAudio(
  audioBlob: Blob
): Promise<{ success: boolean; data?: { text: string }; error?: string }> {
  try {
    const formData = new FormData()
    formData.append('audio', audioBlob, 'recording.webm')

    const response = await fetch(`${BASE_URL}/stt`, {
      method: 'POST',
      body: formData,
    })

    if (!response.ok) {
      throw new Error(`API error: ${response.status} ${response.statusText}`)
    }

    const raw = await response.json()

    if (!raw.success) {
      return { success: false, error: raw.error || '语音识别失败' }
    }

    return { success: true, data: { text: raw.text } }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Network error'
    console.error('[SpeechApi] transcribeAudio failed:', message)
    return { success: false, error: message }
  }
}

export async function requestTTS(
  text: string
): Promise<{ success: boolean; data?: { audio_path: string }; error?: string }> {
  try {
    const response = await fetch(`${BASE_URL}/tts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
    })

    if (!response.ok) {
      throw new Error(`API error: ${response.status} ${response.statusText}`)
    }

    const raw = await response.json()

    if (!raw.success) {
      return { success: false, error: raw.error || '语音合成失败' }
    }

    return { success: true, data: { audio_path: raw.audio_path || '' } }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Network error'
    console.error('[SpeechApi] requestTTS failed:', message)
    return { success: false, error: message }
  }
}

export async function fetchNewestAudio(): Promise<{
  success: boolean
  data?: Blob
  error?: string
}> {
  try {
    const response = await fetch(`${BASE_URL}/get_newest_audio`)
    if (!response.ok) {
      throw new Error(`API error: ${response.status} ${response.statusText}`)
    }
    const blob = await response.blob()
    return { success: true, data: blob }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Network error'
    console.error('[SpeechApi] fetchNewestAudio failed:', message)
    return { success: false, error: message }
  }
}
