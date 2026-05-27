import { ref, onUnmounted } from 'vue'
import { transcribeAudio } from '@/services/speechApi'

type RecordingState = 'idle' | 'recording' | 'overlay-visible' | 'processing'

export function useVoiceInput(options?: {
  onSend?: (text: string) => void
}) {
  const state = ref<RecordingState>('idle')
  const overlayVisible = ref(false)
  const overlayStatusText = ref('语音输入中')
  const dotCount = ref(1)
  const inlineError = ref<string | null>(null)
  const showPermissionDialog = ref(false)

  let mediaRecorder: MediaRecorder | null = null
  let stream: MediaStream | null = null
  let chunks: Blob[] = []
  let recordStartTime = 0
  let isPressed = false
  let overlayTimer: ReturnType<typeof setTimeout> | null = null
  let maxDurationTimer: ReturnType<typeof setTimeout> | null = null
  let dotInterval: ReturnType<typeof setInterval> | null = null
  let errorDismissTimer: ReturnType<typeof setTimeout> | null = null

  function cleanup() {
    if (overlayTimer) { clearTimeout(overlayTimer); overlayTimer = null }
    if (maxDurationTimer) { clearTimeout(maxDurationTimer); maxDurationTimer = null }
    if (dotInterval) { clearInterval(dotInterval); dotInterval = null }
    if (errorDismissTimer) { clearTimeout(errorDismissTimer); errorDismissTimer = null }
    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
      mediaRecorder.stop()
    }
    if (stream) {
      stream.getTracks().forEach(t => t.stop())
    }
    mediaRecorder = null
    stream = null
    chunks = []
  }

  function startDotAnimation() {
    dotCount.value = 1
    dotInterval = setInterval(() => {
      dotCount.value = dotCount.value >= 3 ? 1 : dotCount.value + 1
    }, 333)
  }

  function showError(message: string) {
    if (errorDismissTimer) clearTimeout(errorDismissTimer)
    inlineError.value = message
    errorDismissTimer = setTimeout(() => {
      inlineError.value = null
    }, 3000)
  }

  async function startRecording() {
    if (state.value !== 'idle') return

    isPressed = true

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      showError('您的浏览器不支持语音输入')
      isPressed = false
      return
    }

    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    } catch (err) {
      const e = err as DOMException
      console.error('[VoiceInput] getUserMedia failed:', e.name, e.message)
      if (e.name === 'NotAllowedError') {
        showPermissionDialog.value = true
      } else if (e.name === 'NotFoundError') {
        showError('未检测到麦克风设备')
      } else {
        showError('无法访问麦克风')
      }
      isPressed = false
      return
    }

    // User released button while permission prompt was up — abort
    if (!isPressed) {
      stream.getTracks().forEach(t => t.stop())
      stream = null
      return
    }

    const mimeType = MediaRecorder.isTypeSupported('audio/webm')
      ? 'audio/webm'
      : 'audio/webm;codecs=opus'

    mediaRecorder = new MediaRecorder(stream, { mimeType })
    chunks = []
    recordStartTime = Date.now()
    state.value = 'recording'

    mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunks.push(e.data)
    }

    mediaRecorder.start(100)

    overlayTimer = setTimeout(() => {
      state.value = 'overlay-visible'
      overlayVisible.value = true
      overlayStatusText.value = '语音输入中'
      startDotAnimation()
    }, 300)

    maxDurationTimer = setTimeout(() => {
      stopRecording()
    }, 20000)
  }

  function stopRecording() {
    isPressed = false

    if (state.value === 'idle') return

    if (overlayTimer) { clearTimeout(overlayTimer); overlayTimer = null }
    if (maxDurationTimer) { clearTimeout(maxDurationTimer); maxDurationTimer = null }
    if (dotInterval) { clearInterval(dotInterval); dotInterval = null }

    const duration = Date.now() - recordStartTime

    if (state.value === 'recording') {
      // Short press — cancel
      cleanup()
      state.value = 'idle'
      return
    }

    // Long press — process
    state.value = 'processing'
    overlayStatusText.value = '处理中...'

    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
      mediaRecorder.onstop = async () => {
        if (stream) {
          stream.getTracks().forEach(t => t.stop())
          stream = null
        }

        const blob = new Blob(chunks, { type: mediaRecorder?.mimeType || 'audio/webm' })
        chunks = []

        // Wait 300ms after release before hiding overlay
        await new Promise(resolve => setTimeout(resolve, 300))

        overlayVisible.value = false

        // Wait for fade-out transition (300ms) before resetting state
        await new Promise(resolve => setTimeout(resolve, 300))
        state.value = 'idle'

        const result = await transcribeAudio(blob)
        if (!result.success || !result.data) {
          showError(result.error || '语音识别失败，请重试')
          return
        }

        options?.onSend?.(result.data.text)
      }

      mediaRecorder.stop()
    } else {
      overlayVisible.value = false
      state.value = 'idle'
    }
  }

  function dismissPermissionDialog() {
    showPermissionDialog.value = false
  }

  onUnmounted(() => {
    cleanup()
  })

  return {
    overlayVisible,
    overlayStatusText,
    dotCount,
    inlineError,
    showPermissionDialog,
    isRecording: () => state.value !== 'idle',
    startRecording,
    stopRecording,
    dismissPermissionDialog,
  }
}
