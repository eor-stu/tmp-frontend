<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()
const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'

const videoRef = ref<HTMLVideoElement | null>(null)
const capturedImage = ref<string | null>(null)
const stream = ref<MediaStream | null>(null)
const status = ref<'idle' | 'loading' | 'done'>('idle')
const username = ref<string | null>(null)

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
  capturedImage.value = canvas.toDataURL('image/jpeg')
  status.value = 'loading'

  try {
    const res = await fetch(`${BASE_URL}/face-recog`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ image: capturedImage.value }),
    })
    const data = await res.json()
    username.value = data.username
    status.value = 'done'

    setTimeout(() => {
      router.push('/')
    }, 2500)
  } catch {
    status.value = 'idle'
  }
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
      <div v-if="status !== 'idle'" class="loading-overlay">
        <div v-if="status === 'loading'" class="loading-spinner" />
        <p class="loading-text">
          {{ status === 'done' ? `${username} 您好` : '登录中...' }}
        </p>
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
