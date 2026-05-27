<script setup lang="ts">
import { ref, watch, onMounted } from 'vue'
import { useSettingsStore } from '@/stores/settings'
import { useSessionStore } from '@/stores/session'
import { useVoiceTTS } from '@/composables/useVoiceTTS'
import { fetchFaceUsers } from '@/services/faceApi'
import AppHeader from '@/components/ui/AppHeader.vue'
import ChatInput from '@/components/ui/ChatInput.vue'

const settings = useSettingsStore()
const sessionStore = useSessionStore()

const CLINIC_CN_NAME: Record<string, string> = {
  emergency_clinic: '急诊室',
  surgery_clinic: '外科诊室',
  internal_clinic: '内科诊室',
  pediatric_clinic: '儿科诊室',
}

interface ChecklistItem {
  text: string
  subtext: string
  done: boolean
  urgent?: boolean
}

interface Message {
  type: 'bot' | 'user'
  content?: string
  hasDashboard?: boolean
  progressPercent?: number
  progressTitle?: string
  progressDescription?: string
  checklist?: ChecklistItem[]
}

const checklistItems = ref<ChecklistItem[]>([
  { text: '阿莫西林 (500mg)', subtext: '已于上午 8:00 服用', done: true },
  { text: '喝 240ml 温茶/汤', subtext: '现在建议服用', done: false, urgent: true },
  { text: '呼吸练习 (10 分钟)', subtext: '预约下午 2:00', done: false }
])

const messages = ref<Message[]>([])

onMounted(async () => {
  try {
    const users = await fetchFaceUsers()
    const currentUser = users.find(u => u.name === sessionStore.faceUserName)

    let greeting: string
    if (!currentUser || !currentUser.last_clinic_id) {
      greeting = '看起来你还没有就诊过。有什么想问的吗？'
    } else {
      const clinicName = CLINIC_CN_NAME[currentUser.last_clinic_id] || currentUser.last_clinic_id
      greeting = `你最近好像在${clinicName}就诊过。有什么想问的吗？`
    }

    messages.value.push({ type: 'bot', content: greeting })
  } catch {
    messages.value.push({
      type: 'bot',
      content: '您好！有什么我可以给您服务的吗？想提什么问题我都会尽力回答的！',
    })
  }
})

const sendMessage = (content: string) => {
  try {
    if (!content) return

    messages.value.push({
      type: 'user',
      content
    })
  } catch (error) {
    console.error('Failed to send message:', error)
  }
}

const { playText } = useVoiceTTS()

// Auto-TTS on new bot messages
watch(
  () => messages.value.filter(m => m.type === 'bot').length,
  async () => {
    if (!settings.isVoiceReadingEnabled) return
    const lastBot = [...messages.value].reverse().find(m => m.type === 'bot')
    if (!lastBot || !lastBot.content) return
    await playText(lastBot.content)
  }
)
</script>

<template>
  <v-main>
    <!-- Header -->
    <AppHeader title="健康管家" />

    <!-- Chat Messages -->
    <div class="chat-container">
      <div
        v-for="(msg, idx) in messages"
        :key="idx"
        :class="['message-wrapper', msg.type === 'user' ? 'user-wrapper' : 'bot-wrapper']"
      >
        <!-- Bot Message -->
        <template v-if="msg.type === 'bot'">
          <div class="bot-avatar">
            <v-icon size="18" style="font-variation-settings: 'FILL' 1">mdi-health-and-safety</v-icon>
          </div>
          <div class="message-bubble bot-bubble">
            <p v-if="msg.content" class="message-text" style="white-space: pre-line">{{ msg.content }}</p>

            <!-- Recovery Dashboard -->
            <div v-if="msg.hasDashboard" class="recovery-dashboard">
              <!-- Progress Tracker Card -->
              <div class="dashboard-card">
                <div class="card-header">
                  <h3 class="card-title">{{ msg.progressTitle }}</h3>
                  <span class="progress-badge">{{ msg.progressPercent }}%</span>
                </div>
                <div class="progress-bar-track">
                  <div class="progress-bar-fill" :style="{ width: msg.progressPercent + '%' }"></div>
                </div>
                <p class="progress-description">{{ msg.progressDescription }}</p>
              </div>

              <!-- Treatment Checklist Card -->
              <div class="dashboard-card">
                <div class="checklist-header">
                  <v-icon size="20" color="#006a63">mdi-fact-check</v-icon>
                  <h3 class="card-title">今日治疗计划</h3>
                </div>
                <ul class="checklist">
                  <li
                    v-for="(item, i) in msg.checklist"
                    :key="i"
                    :class="['checklist-item', item.done ? 'done' : 'pending']"
                  >
                    <v-icon
                      size="20"
                      :color="item.done ? '#006a63' : '#6e797b'"
                      :style="item.done ? 'font-variation-settings: \'FILL\' 1' : ''"
                    >
                      {{ item.done ? 'mdi-check-circle' : 'mdi-radio-button-unchecked' }}
                    </v-icon>
                    <div class="checklist-content">
                      <span class="checklist-text">{{ item.text }}</span>
                      <span class="checklist-subtext" :class="{ urgent: item.urgent && !item.done }">
                        {{ item.subtext }}
                      </span>
                    </div>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </template>

        <!-- User Message -->
        <template v-else>
          <div class="message-bubble user-bubble">
            <span class="message-text">{{ msg.content }}</span>
          </div>
        </template>
      </div>
    </div>

    <!-- Chat Input -->
    <ChatInput
      placeholder="回复助手..."
      @send="sendMessage"
    />
  </v-main>
</template>

<style scoped lang="scss">
// Clinical Sanctuary Design Tokens
$primary: #00606d;
$primary-container: #007b8b;
$secondary-container: #8bf1e6;
$surface-container-low: #f1f4f5;
$surface-container-high: #e5e9ea;
$surface-container-highest: #e0e3e4;
$surface-container: #ebeeef;
$surface-container-lowest: #ffffff;
$on-surface: #181c1d;
$on-surface-variant: #3e494b;
$on-primary: #ffffff;
$background: #f7fafb;
$outline: #6e797b;
$secondary: #006a63;
$error: #ba1a1a;

// Chat Container
.chat-container {
  max-width: 48rem;
  margin: 0 auto;
  padding: 7rem 1rem 10rem;
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

// Message Wrappers
.message-wrapper {
  display: flex;
  align-items: flex-end;
  gap: 0.75rem;

  &.user-wrapper {
    justify-content: flex-end;
  }
}

.bot-wrapper {
  flex-direction: row;
}

.user-wrapper {
  flex-direction: row;
}

// Bot Avatar
.bot-avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: $secondary-container;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  margin-bottom: 0.25rem;

  .v-icon {
    color: $secondary;
  }
}

// Message Bubbles
.message-bubble {
  padding: 1rem;
  border-radius: 1rem;
  max-width: 85%;

  @media (min-width: 768px) {
    max-width: 80%;
  }

  &.bot-bubble {
    background: $surface-container-highest;
    color: $on-surface;
    box-shadow: 0 4px 40px rgba($on-surface, 0.06);
  }

  &.user-bubble {
    background: linear-gradient(135deg, $primary 0%, $primary-container 100%);
    color: $on-primary;
    box-shadow: 0 4px 40px rgba($on-surface, 0.06);
  }
}

.message-text {
  font-family: 'Inter', sans-serif;
  font-size: 0.9375rem;
  line-height: 1.6;
}

// Recovery Dashboard
.recovery-dashboard {
  margin-top: 1rem;
  padding-left: 2.75rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.dashboard-card {
  background: $surface-container-lowest;
  border: 1px solid rgba($outline, 0.15);
  border-radius: 1rem;
  padding: 1.25rem;
  box-shadow: 0 4px 40px rgba($on-surface, 0.06);
  transition: box-shadow 300ms ease;

  &:hover {
    box-shadow: 0 8px 50px rgba($on-surface, 0.08);
  }
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.75rem;
}

.card-title {
  font-family: 'Manrope', sans-serif;
  font-weight: 600;
  font-size: 1rem;
  color: $on-surface;
}

.progress-badge {
  background: rgba($primary, 0.2);
  color: $primary;
  font-family: 'Inter', sans-serif;
  font-weight: 700;
  font-size: 0.875rem;
  padding: 0.125rem 0.625rem;
  border-radius: 9999px;
}

.progress-bar-track {
  width: 100%;
  height: 10px;
  background: $surface-container-high;
  border-radius: 9999px;
  overflow: hidden;
}

.progress-bar-fill {
  height: 100%;
  background: $primary;
  border-radius: 9999px;
  transition: width 1000ms ease-out;
}

.progress-description {
  font-family: 'Inter', sans-serif;
  font-size: 0.875rem;
  color: $on-surface-variant;
  margin-top: 0.75rem;
}

.checklist-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 1rem;
}

.checklist {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.checklist-item {
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
  padding: 0.75rem;
  border-radius: 0.5rem;
  background: $surface-container-low;
  transition: all 200ms ease;
  cursor: pointer;

  &:hover {
    background: $surface-container;
  }

  &.done {
    .checklist-text {
      text-decoration: line-through;
      opacity: 0.7;
    }
    .checklist-subtext {
      opacity: 0.7;
    }
  }

  &.pending {
    .checklist-text {
      color: $on-surface;
    }
  }
}

.checklist-content {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.checklist-text {
  font-family: 'Inter', sans-serif;
  font-size: 0.875rem;
  font-weight: 500;
  color: $on-surface;
}

.checklist-subtext {
  font-family: 'Inter', sans-serif;
  font-size: 0.75rem;
  color: $on-surface-variant;
  margin-top: 0.125rem;

  &.urgent {
    color: $error;
    font-weight: 500;
  }
}

</style>
