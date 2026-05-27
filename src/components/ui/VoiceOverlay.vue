<script setup lang="ts">
interface Props {
  visible: boolean
  statusText: string
  dotCount: number
}

defineProps<Props>()
</script>

<template>
  <Teleport to="body">
    <Transition name="overlay-fade">
      <div v-if="visible" class="voice-overlay">
        <div class="voice-overlay-content">
          <span class="voice-status-text">{{ statusText }}<span class="voice-dots">{{ '.'.repeat(dotCount) }}</span></span>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped lang="scss">
.voice-overlay {
  position: fixed;
  inset: 0;
  z-index: 100;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(24, 28, 29, 0.5);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  pointer-events: none;
}

.voice-overlay-content {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.voice-status-text {
  font-family: 'Manrope', sans-serif;
  font-size: 1.5rem;
  font-weight: 600;
  color: #ffffff;
  letter-spacing: -0.02em;
}

.voice-dots {
  display: inline;
}

.overlay-fade-enter-active,
.overlay-fade-leave-active {
  transition: opacity 300ms ease;
}

.overlay-fade-enter-from,
.overlay-fade-leave-to {
  opacity: 0;
}
</style>
