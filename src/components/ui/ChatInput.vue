<script setup lang="ts">
import { ref } from 'vue'
import { useVoiceInput } from '@/composables/useVoiceInput'
import VoiceOverlay from '@/components/ui/VoiceOverlay.vue'

interface Props {
  placeholder?: string
  maxLength?: number
  disabled?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  placeholder: '输入...',
  maxLength: 500,
  disabled: false,
})

const emit = defineEmits<{
  (e: 'send', value: string): void
}>()

const inputValue = ref('')

const send = () => {
  if (props.disabled) return

  const content = inputValue.value.trim()
  if (!content) return

  emit('send', content)
  inputValue.value = ''
}

const {
  overlayVisible,
  overlayStatusText,
  dotCount,
  inlineError,
  showPermissionDialog,
  startRecording,
  stopRecording,
  dismissPermissionDialog,
} = useVoiceInput({
  onSend: (text: string) => emit('send', text),
})
</script>

<template>
  <div class="chat-input-wrapper">
    <!-- Permission dialog -->
    <Transition name="fade">
      <div v-if="showPermissionDialog" class="permission-dialog">
        <span class="permission-text">语音功能需要麦克风权限</span>
        <div class="permission-actions">
          <button class="permission-btn permission-btn--primary" @click="dismissPermissionDialog">
            设置
          </button>
          <button class="permission-btn" @click="dismissPermissionDialog">
            取消
          </button>
        </div>
      </div>
    </Transition>

    <!-- Inline error -->
    <Transition name="fade">
      <div v-if="inlineError" class="voice-error">
        <v-icon size="16">mdi-alert-circle</v-icon>
        <span>{{ inlineError }}</span>
      </div>
    </Transition>

    <!-- Input bar -->
    <div class="chat-input-container" :class="{ disabled }">
      <button
        class="voice-btn"
        :disabled="disabled"
        @mousedown.prevent="startRecording"
        @mouseup="stopRecording"
        @mouseleave="stopRecording"
        @touchstart.prevent="startRecording"
        @touchend="stopRecording"
      >
        <v-icon size="20">mdi-microphone</v-icon>
      </button>
      <input
        v-model="inputValue"
        type="text"
        class="chat-input"
        :placeholder="placeholder"
        :maxlength="maxLength"
        :disabled="disabled"
        @keyup.enter="send"
      />
      <button class="send-btn" :disabled="disabled" @click="send">
        <v-icon size="20">mdi-send</v-icon>
      </button>
    </div>

    <!-- Voice recording overlay -->
    <VoiceOverlay
      :visible="overlayVisible"
      :status-text="overlayStatusText"
      :dot-count="dotCount"
    />
  </div>
</template>

<style scoped lang="scss">
$primary: #00606d;
$primary-container: #007b8b;
$surface-container-high: #e5e9ea;
$surface-container-lowest: #ffffff;
$on-surface: #181c1d;
$on-surface-variant: #3e494b;
$on-primary: #ffffff;
$outline: #6e797b;
$background: #f7fafb;
$error: #ba1a1a;
$error-container: #ffdad6;
$on-error-container: #93000a;

.chat-input-wrapper {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  z-index: 40;
  padding: 1.5rem 1rem 2rem;
  background: linear-gradient(to top, $background 80%, transparent);
  pointer-events: none;

  @media (min-width: 768px) {
    bottom: 1.5rem;
    left: 50%;
    right: auto;
    transform: translateX(-50%);
    max-width: 48rem;
    padding: 1.5rem;
  }
}

.permission-dialog {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  padding: 0.75rem 1rem;
  margin-bottom: 0.5rem;
  background: $surface-container-lowest;
  border-radius: 0.75rem;
  border: 1px solid rgba($outline, 0.15);
  box-shadow: 0 4px 12px rgba($on-surface, 0.06);
  pointer-events: auto;
}

.permission-text {
  font-family: 'Inter', sans-serif;
  font-size: 0.8125rem;
  color: $on-surface;
}

.permission-actions {
  display: flex;
  gap: 0.5rem;
  flex-shrink: 0;
}

.permission-btn {
  padding: 0.375rem 0.875rem;
  border-radius: 9999px;
  font-family: 'Inter', sans-serif;
  font-size: 0.8125rem;
  font-weight: 500;
  border: 1px solid rgba($outline, 0.25);
  background: transparent;
  color: $on-surface-variant;
  cursor: pointer;
  transition: all 200ms ease;

  &:hover {
    background: rgba($on-surface-variant, 0.08);
  }

  &--primary {
    background: $primary;
    color: $on-primary;
    border-color: $primary;

    &:hover {
      background: $primary-container;
      border-color: $primary-container;
    }
  }
}

.voice-error {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.625rem 1rem;
  margin-bottom: 0.5rem;
  background: $error-container;
  color: $on-error-container;
  border-radius: 9999px;
  font-family: 'Inter', sans-serif;
  font-size: 0.8125rem;
  pointer-events: auto;
  box-shadow: 0 2px 8px rgba($on-surface, 0.06);
}

.chat-input-container {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem;
  background: $surface-container-high;
  border-radius: 9999px;
  box-shadow: 0 4px 12px rgba($on-surface, 0.06);
  border: 1px solid rgba($outline, 0.15);
  pointer-events: auto;
}

.chat-input {
  flex: 1;
  background: transparent;
  border: none;
  outline: none;
  font-family: 'Inter', sans-serif;
  font-size: 0.875rem;
  color: $on-surface;

  &::placeholder {
    color: rgba($on-surface-variant, 0.6);
  }
}

.voice-btn {
  width: 48px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  color: $on-surface-variant;
  border-radius: 50%;
  transition: all 300ms ease;
  flex-shrink: 0;
  border: 1px solid rgba($outline, 0.25);
  padding: 0;
  cursor: pointer;
  user-select: none;
  -webkit-user-select: none;

  &:active:not(:disabled) {
    transform: scale(0.95);
  }

  &:hover:not(:disabled) {
    background: rgba($on-surface-variant, 0.08);
    border-color: rgba($outline, 0.4);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
}

.send-btn {
  width: 48px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, $primary 0%, $primary-container 100%);
  color: $on-primary;
  border-radius: 50%;
  box-shadow: 0 4px 12px rgba($on-surface, 0.08);
  transition: all 300ms ease;
  flex-shrink: 0;

  &:active:not(:disabled) {
    transform: scale(0.95);
  }

  &:hover:not(:disabled) {
    box-shadow: 0 8px 24px rgba($on-surface, 0.12);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
}

.chat-input-container.disabled {
  opacity: 0.6;
}

.chat-input:disabled {
  cursor: not-allowed;
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 200ms ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
