<script setup lang="ts">
import { ref, computed, watch, nextTick, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { useSessionStore } from '@/stores/session'
import TypewriterText from '@/components/ui/TypewriterText.vue'

const router = useRouter()
const sessionStore = useSessionStore()
const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'

const videoRef = ref<HTMLVideoElement | null>(null)
const capturedImage = ref<string | null>(null)
const stream = ref<MediaStream | null>(null)
const status = ref<'idle' | 'loading' | 'done' | 'register'>('idle')
const username = ref<string | null>(null)
const nameInput = ref('')
const typewriterRef = ref<InstanceType<typeof TypewriterText> | null>(null)

const greetingText = computed(() => username.value ? `${username.value} 您好` : '')

watch(status, async (s) => {
  if (s !== 'done') return
  await nextTick()
  await typewriterRef.value?.start()
  setTimeout(() => {
    router.push('/')
  }, 2500)
})

onMounted(async () => {
  try {
    stream.value = await navigator.mediaDevices.getUserMedia({ video: true })
    if (videoRef.value) {
      videoRef.value.srcObject = stream.value
    }
  } catch {
    // camera denied or unavailable — silently handle
  }
})

onUnmounted(() => {
  stream.value?.getTracks().forEach((track) => track.stop())
})

async function capture() {
  const video = videoRef.value
  if (!video) return

  const canvas = document.createElement('canvas')
  canvas.width = video.videoWidth
  canvas.height = video.videoHeight
  canvas.getContext('2d')!.drawImage(video, 0, 0)
  const dataUrl = canvas.toDataURL('image/jpeg')
  capturedImage.value = dataUrl
  status.value = 'loading'

  try {
    const form = new FormData()
    form.append('image', dataUrlToBlob(dataUrl), 'face.jpg')

    const res = await fetch(`${BASE_URL}/face/face-recog`, {
      method: 'POST',
      body: form,
    })
    const data = await res.json()

    if (!data.exist) {
      status.value = 'register'
      return
    }

    username.value = data.name
    sessionStore.setFaceUser(data.name)
    status.value = 'done'
  } catch {
    status.value = 'idle'
  }
}

async function registerName() {
  const name = nameInput.value.trim()
  if (!name || !capturedImage.value) return

  status.value = 'loading'

  try {
    const form = new FormData()
    form.append('name', name)
    form.append('image', dataUrlToBlob(capturedImage.value), 'face.jpg')

    const res = await fetch(`${BASE_URL}/face/register`, {
      method: 'POST',
      body: form,
    })
    const data = await res.json()

    if (data.success) {
      router.push('/')
    } else {
      status.value = 'register'
    }
  } catch {
    status.value = 'register'
  }
}

function dataUrlToBlob(dataUrl: string): Blob {
  const parts = dataUrl.split(',')
  const mime = parts[0].match(/:(.*?);/)![1]
  const bytes = atob(parts[1])
  const buf = new ArrayBuffer(bytes.length)
  const arr = new Uint8Array(buf)
  for (let i = 0; i < bytes.length; i++) {
    arr[i] = bytes.charCodeAt(i)
  }
  return new Blob([buf], { type: mime })
}
</script>

<template>
  <v-main>
    <div class="page">
      <!-- Decorative blobs -->
      <div class="bg-blob bg-blob--primary" />
      <div class="bg-blob bg-blob--secondary" />

      <div class="container">
        <h2 class="title">人脸识别登录中</h2>

        <!-- Camera circle -->
        <div class="camera-circle">
          <video ref="videoRef" autoplay playsinline class="camera-video" />
        </div>

        <!-- Capture button -->
        <button class="capture-btn" @click="capture">
          拍照
        </button>

        <!-- Preview of captured image -->
        <div v-if="capturedImage" class="preview">
          <img :src="capturedImage" alt="captured" class="preview-img" />
        </div>
      </div>

      <!-- Loading overlay -->
      <div v-if="status === 'loading' || status === 'done'" class="loading-overlay">
        <template v-if="status === 'loading'">
          <div class="loading-spinner" />
          <p class="loading-text">登录中...</p>
        </template>
        <TypewriterText
          v-else
          ref="typewriterRef"
          :content="greetingText"
          class="greeting-text"
        />
      </div>

      <!-- Register overlay -->
      <div v-if="status === 'register'" class="loading-overlay">
        <p class="register-title">未识别到您的面容</p>
        <input
          v-model="nameInput"
          class="register-input"
          placeholder="请输入您的姓名"
          @keyup.enter="registerName"
        />
        <button class="capture-btn" @click="registerName">
          确认注册
        </button>
      </div>
    </div>
  </v-main>
</template>

<style scoped lang="scss">
$primary: #00606d;
$primary-container: #007b8b;
$secondary-container: #8bf1e6;
$surface-container-lowest: #ffffff;
$surface-container: #ebeeef;
$on-surface: #181c1d;
$on-surface-variant: #3e494b;
$outline-variant: #bdc8cb;
$background: #f7fafb;

.page {
  min-height: 100dvh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 2rem 1.5rem;
  background: rgba($background, 0.5);
  backdrop-filter: blur(4px);
  -webkit-backdrop-filter: blur(4px);
  position: relative;
  overflow: hidden;
}

.container {
  width: 100%;
  max-width: 480px;
  background: rgba($surface-container-lowest, 0.8);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border-radius: 1.5rem;
  padding: 2rem;
  border: 1px solid rgba($outline-variant, 0.15);
  box-shadow: 0 20px 40px -15px rgba($on-surface, 0.06);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1.5rem;
}

// Title
.title {
  font-family: 'Manrope', sans-serif;
  font-weight: 700;
  font-size: 1.25rem;
  color: $primary;
  margin: 0;
  letter-spacing: -0.02em;
}

// Camera circle
.camera-circle {
  width: 200px;
  height: 200px;
  border-radius: 50%;
  overflow: hidden;
  border: 3px solid rgba($primary-container, 0.3);
  background: rgba($surface-container, 0.5);
}

.camera-video {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

// Capture button
.capture-btn {
  padding: 0.75rem 2.5rem;
  border-radius: 9999px;
  background: linear-gradient(135deg, $primary 0%, $primary-container 100%);
  color: $surface-container-lowest;
  font-family: 'Manrope', sans-serif;
  font-weight: 700;
  font-size: 1rem;
  letter-spacing: 0.02em;
  border: 1px solid rgba($surface-container-lowest, 0.2);
  box-shadow: 0 8px 20px -6px rgba($primary, 0.4);
  cursor: pointer;
  transition: transform 150ms ease;

  &:active {
    transform: scale(0.98);
  }
}

// Captured preview
.preview {
  width: 120px;
  height: 120px;
  border-radius: 1rem;
  overflow: hidden;
  border: 2px solid rgba($outline-variant, 0.2);
}

.preview-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

// Loading overlay
.loading-overlay {
  position: absolute;
  inset: 0;
  z-index: 20;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 1.5rem;
  background: rgba($background, 0.6);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border-radius: 1.5rem;
}

.loading-spinner {
  width: 48px;
  height: 48px;
  border: 4px solid rgba($primary-container, 0.2);
  border-top-color: $primary;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

.loading-text {
  font-family: 'Inter', sans-serif;
  font-size: 1rem;
  font-weight: 500;
  color: $on-surface-variant;
  margin: 0;
}

.register-title {
  font-family: 'Manrope', sans-serif;
  font-weight: 600;
  font-size: 1.125rem;
  color: $on-surface;
  margin: 0;
}

.register-input {
  width: 100%;
  max-width: 260px;
  padding: 0.75rem 1rem;
  border-radius: 1rem;
  border: 1px solid rgba($outline-variant, 0.3);
  background: rgba($surface-container-lowest, 0.9);
  font-family: 'Inter', sans-serif;
  font-size: 1rem;
  color: $on-surface;
  text-align: center;
  outline: none;
  transition: border-color 150ms ease;

  &:focus {
    border-color: $primary-container;
  }

  &::placeholder {
    color: rgba($on-surface-variant, 0.5);
  }
}

.greeting-text :deep(.typewriter-char) {
  font-size: 2.5rem;
  font-family: 'Manrope', sans-serif;
  font-weight: 700;
  color: $primary;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

// Decorative blobs
.bg-blob {
  position: absolute;
  border-radius: 50%;
  z-index: -1;

  &--primary {
    top: 2.5rem;
    left: 2.5rem;
    width: 16rem;
    height: 16rem;
    background: rgba($primary-container, 0.3);
    filter: blur(80px);
  }

  &--secondary {
    bottom: 5rem;
    right: 2.5rem;
    width: 20rem;
    height: 20rem;
    background: rgba($secondary-container, 0.3);
    filter: blur(100px);
  }
}
</style>
