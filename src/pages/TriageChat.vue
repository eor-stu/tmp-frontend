<script setup lang="ts">
import { ref, nextTick, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import AppHeader from '@/components/ui/AppHeader.vue'
import ChatInput from '@/components/ui/ChatInput.vue'
import TypewriterText from '@/components/ui/TypewriterText.vue'
import ConfirmationList from '@/components/ui/ConfirmationList.vue'
import ConfirmButton from '@/components/ui/ConfirmButton.vue'
import NavPath from '@/components/ui/NavPath.vue'
import type { ChatMessage } from '~/types/chat'
import type { ComponentRefs, VisibilityState, ConfirmationListExposed, ConfirmButtonExposed, NavPathExposed } from '~/types/components'
import {
  ConversationState,
  type ConversationContext,
  getInitialContext,
  transition,
  formatConditionForConclusion,
  getRecentConclusions,
} from '@/types/conversation'
import {
  collectCondition,
  selectClinic,
  collectRequirement,
  patchRoute,
} from '@/services/triageApi'
import type { RequirementSummary } from '@/services/triageApi'

// Clinic ID to name mapping
const CLINIC_NAME_MAP: Record<string, string> = {
  emergency_clinic: '急诊室',
  surgery_clinic: '外科诊室',
  internal_clinic: '内科诊室',
  pediatric_clinic: '儿科诊室',
}

const router = useRouter()

// ZH display name → EN node_id mapping (for TriageCar navigation)
const ROUTE_ZH_TO_EN: Record<string, string> = {
  '入口': 'entrance',
  '挂号处': 'registration_center',
  '缴费处': 'payment_center',
  '药房': 'pharmacy',
  '出口': 'quit',
  '急诊室': 'emergency_clinic',
  '外科诊室': 'surgery_clinic',
  '内科诊室': 'internal_clinic',
  '儿科诊室': 'pediatric_clinic',
  '卫生间': 'toilet',
}

function convertRouteToNodeIds(route: string[]): string[] {
  return route.map(name => {
    const cleaned = name.replace(/（[^）]*）/g, '')
    return ROUTE_ZH_TO_EN[cleaned] || ROUTE_ZH_TO_EN[name] || name
  })
}

// Conversation state
const conversation = ref<ConversationContext>(getInitialContext())

// Messages to display
const displayedMessages = ref<ChatMessage[]>([])

// Loading state
const isLoading = ref(false)

// Error state
const errorMessage = ref<string | null>(null)

// Animation state
const isAnimating = ref(false)

// Smart auto-scroll: respects user manual scrolling
let isUserScrolling = false
let resumeTimer: ReturnType<typeof setTimeout> | null = null
let scrollAnimationId: number | null = null

const RESUME_DELAY = 3000 // resume auto-scroll 3s after user stops scrolling

// cubic-bezier(0.33, 1, 0.68, 1) — ease-out-expo variant
// Solve t from x using cubic bezier formula: x(t) = 3(1-t)²t·x1 + 3(1-t)·t²·x2 + t³
const solveCubicBezier = (x: number): number => {
  // Newton-Raphson iteration to find t given x
  // Control points: P1=(0.4, 0), P2=(0.2, 1) — S-curve: slow start, fast middle, slow end
  let t = x
  for (let i = 0; i < 8; i++) {
    const currentX = 3 * (1 - t) * (1 - t) * t * 0.4 + 3 * (1 - t) * t * t * 0.2 + t * t * t
    const derivative = 3 * (1 - t) * (1 - t) * 0.4 + 6 * (1 - t) * t * (0.4 - 0.2) + 3 * t * t * (0.2 - 0) + 3 * t * t * 0.4
    if (Math.abs(derivative) < 1e-6) break
    t = t - (currentX - x) / derivative
    t = Math.max(0, Math.min(1, t))
  }
  return t
}

const easeInOutExpo = (t: number): number => {
  // y(t) = 3(1-t)²t·y1 + 3(1-t)·t²·y2 + t³
  // y1=0, y2=1 → 3(1-t)²t·0 + 3(1-t)·t²·1 + t³ = 3(1-t)·t² + t³ = t²(3-2t)
  if (t >= 1) return 1
  const eased = solveCubicBezier(t)
  return eased * eased * (3 - 2 * eased)
}

// Smooth scroll to bottom with cubic-bezier easing
const smoothScrollToBottom = (targetY: number) => {
  if (scrollAnimationId) {
    cancelAnimationFrame(scrollAnimationId)
  }

  const startY = window.scrollY
  const distance = targetY - startY
  if (distance === 0) return

  const duration = 3500 // ms
  const startTime = performance.now()

  const animate = (currentTime: number) => {
    const elapsed = currentTime - startTime
    const progress = Math.min(elapsed / duration, 1)
    const easedProgress = easeInOutExpo(progress)
    const currentY = startY + distance * easedProgress

    window.scrollTo(0, currentY)

    if (progress < 1) {
      scrollAnimationId = requestAnimationFrame(animate)
    } else {
      scrollAnimationId = null
    }
  }

  scrollAnimationId = requestAnimationFrame(animate)
}

// Check if bottom is visible in viewport
const isBottomVisible = (): boolean => {
  const scrollTop = window.scrollY
  const clientHeight = window.innerHeight
  const scrollHeight = document.documentElement.scrollHeight
  return scrollHeight - scrollTop - clientHeight < 100
}

// Try to scroll to bottom, respects user scroll state
const tryScrollToBottom = () => {
  if (isUserScrolling) return
  if (!isBottomVisible()) {
    smoothScrollToBottom(document.documentElement.scrollHeight)
  }
}

// On user scroll: pause auto-scroll, restart resume timer
const handleUserScroll = () => {
  if (!isUserScrolling) {
    isUserScrolling = true
  }
  if (resumeTimer) clearTimeout(resumeTimer)
  resumeTimer = setTimeout(() => {
    isUserScrolling = false
    tryScrollToBottom()
  }, RESUME_DELAY)
}

// Handle charTyped events from TypewriterText (event delegation)
const handleCharTyped = () => {
  if (isUserScrolling) return
  if (!isBottomVisible()) {
    smoothScrollToBottom(document.documentElement.scrollHeight)
  }
}

onMounted(() => {
  window.addEventListener('scroll', handleUserScroll, { passive: true })
  const chatContainer = document.querySelector('.chat-container')
  chatContainer?.addEventListener('charTyped', handleCharTyped)
})

onUnmounted(() => {
  window.removeEventListener('scroll', handleUserScroll)
  const chatContainer = document.querySelector('.chat-container')
  chatContainer?.removeEventListener('charTyped', handleCharTyped)
  if (resumeTimer) clearTimeout(resumeTimer)
  if (scrollAnimationId) cancelAnimationFrame(scrollAnimationId)
})

// Greeting message shown on load
const greetingMessage: ChatMessage = {
  type: 'bot',
  content: ['您好，我是您的智能导诊助手！为了给您提供更加准确的导诊服务，请您先描述一下自己前来就诊的原因、当前的感受等信息哦！'],
}

// Auto-play greeting on page load
onMounted(async () => {
  displayedMessages.value.push(greetingMessage)
  await nextTick()
  requestAnimationFrame(() => {
    playAnimationSequence(0)
  })
})

// Component refs organized by message index
const componentRefsMap = ref<Map<number, ComponentRefs>>(new Map())
const visibilityMap = ref<Map<number, VisibilityState>>(new Map())

// Set visibility state for a message index
const setVisibility = (msgIdx: number, state: VisibilityState) => {
  visibilityMap.value.set(msgIdx, state)
}

// Get visibility state for a message index
const getVisibility = (msgIdx: number): VisibilityState => {
  return visibilityMap.value.get(msgIdx) || { confirmationList: false, confirmButton: false, navPath: false }
}

function isConfirmationMessage(content: string): boolean {
  const normalized = content.replace(/[\s！!。,.，？?；;:：]/g, '')

  if (!normalized) {
    return false
  }

  const rejectPhrases = ['不确认', '不要确认', '没确认', '不行', '不对', '不是的']
  if (rejectPhrases.some(phrase => normalized.includes(phrase))) {
    return false
  }

  const confirmPhrases = ['没问题', '确认', '确认了', '是的', '好的', '可以', '好']
  return confirmPhrases.includes(normalized)
}

function mergeRequirements(
  existing: RequirementSummary[],
  incoming: RequirementSummary[]
): RequirementSummary[] {
  const merged = [...existing]

  for (const requirement of incoming) {
    const isDuplicate = merged.some(
      (item) => item.when === requirement.when && item.what === requirement.what
    )

    if (!isDuplicate) {
      merged.push(requirement)
    }
  }

  return merged
}

// Send message handler - routes based on conversation state
const sendMessage = async (content: string) => {
  try {
    if (!content || isAnimating.value || isLoading.value) return

    errorMessage.value = null

    // Add user message
    displayedMessages.value.push({
      type: 'user',
      content: [content],
    })

    await nextTick()
    tryScrollToBottom()

    switch (conversation.value.state) {
      case ConversationState.COLLECTING_CONDITION:
        await handleCollectCondition(content)
        break
      case ConversationState.CONFIRMING_CONDITION:
        await handleConfirmCondition(content)
        break
      case ConversationState.CONFIRMING_ROUTE:
        await handleRouteModification(content)
        break
      default:
        if (import.meta.env.DEV) {
          console.warn('[TriageChat] Unexpected state for user message:', conversation.value.state)
        }
    }
  } catch (error) {
    console.error('Failed to send message:', error)
    showError('发送消息失败，请重试')
  }
}

// Handle condition collection (COLLECTING_CONDITION state)
async function handleCollectCondition(description: string) {
  isLoading.value = true

  // Pass last 3 conclusions as history for context continuity
  const previousConclusions = getRecentConclusions(conversation.value.conclusions, 3)
  const result = await collectCondition(description, previousConclusions)

  isLoading.value = false

  if (!result.success || !result.data) {
    showError(result.error || '解析症状失败')
    return
  }

  // Format and save the condition to conclusions history
  const formatted = formatConditionForConclusion(result.data.structured_condition)
  conversation.value.conclusions.push(formatted)

  // Store condition and transition to confirming
  conversation.value.condition = result.data.structured_condition
  conversation.value.state = transition(conversation.value.state, ConversationState.CONFIRMING_CONDITION)

  // Build confirmation message
  const condition = result.data.structured_condition
  const confirmationMessage: ChatMessage = {
    type: 'bot',
    content: [
      '我明白你的意思了！',
      {
        type: 'confirmation-list',
        items: [
          { label: '不适部位：', value: condition.body_parts || condition.symptoms?.join('；') || '未提供' },
          { label: '严重程度：', value: condition.severity || '未提供' },
          { label: '持续时间：', value: condition.duration || '未提供' },
        ],
      },
      '请确认你的当前状况，这有助于我们对您的病情进行建模。',
      '如果觉得没问题，直接确认就行；',
      '如果觉得和你的感觉不同，就进行更改，直到完全符合你的感觉。',
      { type: 'confirm-button' },
    ],
  }

  displayedMessages.value.push(confirmationMessage)
  await nextTick()
  await playAnimationSequence(displayedMessages.value.length - 1)
}

// Handle condition confirmation/modification (CONFIRMING_CONDITION state)
async function handleConfirmCondition(content: string) {
  // User wants to confirm - proceed to next phase
  if (isConfirmationMessage(content)) {
    await proceedToClinicSelection()
    return
  }

  // User providing modifications - treat as new input, call API with history
  isLoading.value = true

  const previousConclusions = getRecentConclusions(conversation.value.conclusions, 3)
  const result = await collectCondition(content, previousConclusions)

  isLoading.value = false

  if (!result.success || !result.data) {
    showError(result.error || '解析症状失败')
    return
  }

  // Format and save the NEW condition to conclusions (append, not replace)
  const formatted = formatConditionForConclusion(result.data.structured_condition)
  conversation.value.conclusions.push(formatted)

  // Update condition and stay in CONFIRMING_CONDITION
  conversation.value.condition = result.data.structured_condition

  // Build new confirmation message
  const condition = result.data.structured_condition
  const confirmationMessage: ChatMessage = {
    type: 'bot',
    content: [
      '我明白你的意思了！',
      {
        type: 'confirmation-list',
        items: [
          { label: '不适部位：', value: condition.body_parts || condition.symptoms?.join('；') || '未提供' },
          { label: '严重程度：', value: condition.severity || '未提供' },
          { label: '持续时间：', value: condition.duration || '未提供' },
        ],
      },
      '请确认你的当前状况，这有助于我们对您的病情进行建模。',
      '如果觉得没问题，直接确认就行；',
      '如果觉得和你的感觉不同，就进行更改，直到完全符合你的感觉。',
      { type: 'confirm-button' },
    ],
  }

  displayedMessages.value.push(confirmationMessage)
  await nextTick()
  await playAnimationSequence(displayedMessages.value.length - 1)
}

// Proceed to clinic selection after condition is confirmed
async function proceedToClinicSelection() {
  if (!conversation.value.condition) return

  isLoading.value = true

  const condition = conversation.value.condition
  const result = await selectClinic(
    condition.symptoms.join('；'),
    condition.duration,
    condition.severity,
    '' // description
  )

  isLoading.value = false

  if (!result.success || !result.data) {
    showError(result.error || '选择诊室失败')
    return
  }

  // Store clinic info and transition
  const clinicName = CLINIC_NAME_MAP[result.data.clinic_id] || result.data.clinic_id
  conversation.value.clinicId = result.data.clinic_id
  conversation.value.clinicName = clinicName
  conversation.value.route = ['入口（当前地点）', '挂号处', clinicName, '缴费处', '药房', '出口']
  conversation.value.state = transition(conversation.value.state, ConversationState.SELECTING_CLINIC)

  // Show clinic selection result
  const clinicMessage: ChatMessage = {
    type: 'bot',
    content: [
      `好的！分析完您的病情后，为您选择了前往 {{highlight}}${clinicName}{{/highlight}} 就诊！\n这是您的行进路程：\n`,
      { type: 'nav-path', route: conversation.value.route.join('+') },
      '\n有什么想修改的吗？直接说就好！\n如果没有，就确认吧！\n',
      { type: 'confirm-button' },
    ],
  }

  // Transition to CONFIRMING_ROUTE after showing the nav path
  conversation.value.state = transition(conversation.value.state, ConversationState.CONFIRMING_ROUTE)

  displayedMessages.value.push(clinicMessage)
  await nextTick()
  await playAnimationSequence(displayedMessages.value.length - 1)
}

// Handle route modifications (CONFIRMING_ROUTE state)
async function handleRouteModification(content: string) {
  // User might confirm or request modifications
  if (isConfirmationMessage(content)) {
    await finishNavigation()
    return
  }

  // User is requesting a modification - collect requirements
  isLoading.value = true

  try {
    const reqResult = await collectRequirement(content)

    if (!reqResult.success || !reqResult.data) {
      showError(reqResult.error || '解析需求失败')
      return
    }

    const existingRequirements = conversation.value.requirements || []
    const allRequirements = mergeRequirements(existingRequirements, reqResult.data.requirements)

    // Try to patch the route
    const patchResult = await patchRoute(
      conversation.value.clinicId || '',
      allRequirements,
      conversation.value.route || []
    )

    if (!patchResult.success || !patchResult.data) {
      showError(patchResult.error || '修改路线失败')
      return
    }

    // Update route
    conversation.value.route = patchResult.data.patched_route
    conversation.value.estimatedWaitTime = patchResult.data.estimated_wait_time
    conversation.value.requirements = allRequirements

    // Show updated route
    const updatedRouteMessage: ChatMessage = {
      type: 'bot',
      content: [
        '我明白你的意思了！现在是新的行进路径：\n',
        { type: 'nav-path', route: conversation.value.route.join('+') },
        '\n还想修改什么吗？\n',
        { type: 'confirm-button' },
      ],
    }

    displayedMessages.value.push(updatedRouteMessage)
    await nextTick()
    await playAnimationSequence(displayedMessages.value.length - 1)
  } finally {
    isLoading.value = false
  }
}

// Finish navigation
async function finishNavigation() {
  conversation.value.state = transition(conversation.value.state, ConversationState.NAVIGATING)

  const finalMessage: ChatMessage = {
    type: 'bot',
    content: ['好的！现在开始导航！'],
  }

  displayedMessages.value.push(finalMessage)
  await nextTick()
  await playAnimationSequence(displayedMessages.value.length - 1)

  const nodeIds = convertRouteToNodeIds(conversation.value.route || [])
  router.push('/triage-car?previous_path=' + nodeIds.join(','))
}

// Show error message in chat
function showError(message: string) {
  errorMessage.value = message

  const errorBotMessage: ChatMessage = {
    type: 'bot',
    content: [`抱歉，${message}`],
  }

  displayedMessages.value.push(errorBotMessage)
  nextTick().then(() => playAnimationSequence(displayedMessages.value.length - 1))
}

// Set component refs for a specific message index
const setComponentRefs = (msgIndex: number, refs: ComponentRefs) => {
  componentRefsMap.value.set(msgIndex, refs)
}

// Get component refs for a specific message index
const getComponentRefs = (msgIndex: number): ComponentRefs | undefined => {
  return componentRefsMap.value.get(msgIndex)
}

// Play animation sequence for a specific bot message
const playAnimationSequence = async (displayedBotIndex: number) => {
  isAnimating.value = true

  const refs = getComponentRefs(displayedBotIndex)

  if (!refs) {
    isAnimating.value = false
    return
  }

  // Initialize visibility state - all components hidden initially
  setVisibility(displayedBotIndex, { confirmationList: false, confirmButton: false, navPath: false })

  // Get the actual message from displayedMessages
  const message = displayedMessages.value[displayedBotIndex]
  if (!message || message.type !== 'bot') {
    isAnimating.value = false
    return
  }

  let typewriterIdx = 0

  for (let i = 0; i < message.content.length; i++) {
    const block = message.content[i]

    if (typeof block === 'string') {
      // TypewriterText animation
      const typewriterRef = refs.typewriters[typewriterIdx]
      if (typewriterRef) {
        await typewriterRef.start()
      }
      typewriterIdx++
    } else if (block.type === 'confirmation-list') {
      // Set visibility to true before starting animation
      const currentVis = getVisibility(displayedBotIndex)
      setVisibility(displayedBotIndex, { ...currentVis, confirmationList: true })
      if (refs.confirmationList) {
        await refs.confirmationList.start()
      }
    } else if (block.type === 'confirm-button') {
      // Set visibility to true before starting animation
      const currentVis = getVisibility(displayedBotIndex)
      setVisibility(displayedBotIndex, { ...currentVis, confirmButton: true })
      if (refs.confirmButton) {
        await refs.confirmButton.start()
      }
    } else if (block.type === 'nav-path') {
      // Set visibility to true before starting animation
      const currentVis = getVisibility(displayedBotIndex)
      setVisibility(displayedBotIndex, { ...currentVis, navPath: true })
      if (refs.navPath) {
        await refs.navPath.start()
      }
    }

    // Wait 100ms before next animation (except for the last block)
    if (i < message.content.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 100))
    }
  }

  isAnimating.value = false
}

// Check if content should use typewriter (string-only message)
const shouldUseTypewriter = (msg: ChatMessage): boolean => {
  return msg.type === 'bot' && msg.content.every(block => typeof block === 'string')
}

// Handle confirm button click - routes based on conversation state
const handleConfirmClick = async (msgIdx: number) => {
  try {
    if (isAnimating.value || isLoading.value) return

    errorMessage.value = null

    // Add user confirmation message
    displayedMessages.value.push({
      type: 'user',
      content: ['确认'],
    })

    await nextTick()
    tryScrollToBottom()

    switch (conversation.value.state) {
      case ConversationState.CONFIRMING_CONDITION:
        await proceedToClinicSelection()
        break
      case ConversationState.CONFIRMING_ROUTE:
        await finishNavigation()
        break
      default:
        if (import.meta.env.DEV) {
          console.warn('[TriageChat] Unexpected state for confirm:', conversation.value.state)
        }
    }
  } catch (error) {
    console.error('Failed to handle confirm:', error)
    showError('确认失败，请重试')
  }
}
</script>

<template>
  <v-main>
    <!-- Header -->
    <AppHeader title="健康管家" />

    <!-- Chat Messages -->
    <div class="chat-container">
      <template v-for="(msg, idx) in displayedMessages" :key="idx">
        <!-- Bot message -->
        <div
          v-if="msg.type === 'bot'"
          class="message-wrapper bot-wrapper"
        >
          <div class="bot-avatar">
            <v-icon size="16" style="font-variation-settings: 'FILL' 1">mdi-robot</v-icon>
          </div>
          <div class="message-bubble bot-bubble">
            <!-- Simple text-only message: use typewriter for full content -->
            <template v-if="shouldUseTypewriter(msg)">
              <TypewriterText
                :ref="el => {
                  if (el) {
                    const refs = getComponentRefs(idx) || { typewriters: [], confirmationList: null, confirmButton: null, navPath: null }
                    refs.typewriters = [el as InstanceType<typeof TypewriterText>]
                    setComponentRefs(idx, refs)
                  }
                }"
                :content="(msg.content as string[]).join('')"
              />
            </template>
            <!-- Rich content: render each block -->
            <template v-else>
              <template v-for="(block, bIdx) in msg.content" :key="bIdx">
                <!-- String: render as typewriter text -->
                <TypewriterText
                  v-if="typeof block === 'string'"
                  :ref="el => {
                    if (el) {
                      const refs = getComponentRefs(idx) || { typewriters: [], confirmationList: null, confirmButton: null, navPath: null }
                      refs.typewriters.push(el as InstanceType<typeof TypewriterText>)
                      setComponentRefs(idx, refs)
                    }
                  }"
                  :content="block"
                />
                <!-- Confirmation List -->
                <ConfirmationList
                  v-else-if="block.type === 'confirmation-list'"
                  :ref="el => {
                    if (el) {
                      const refs = getComponentRefs(idx) || { typewriters: [], confirmationList: null, confirmButton: null, navPath: null }
                      refs.confirmationList = el as unknown as ConfirmationListExposed
                      setComponentRefs(idx, refs)
                    }
                  }"
                  :items="block.items"
                  :visible="getVisibility(idx).confirmationList"
                />
                <!-- Confirm Button -->
                <ConfirmButton
                  v-else-if="block.type === 'confirm-button'"
                  :ref="el => {
                    if (el) {
                      const refs = getComponentRefs(idx) || { typewriters: [], confirmationList: null, confirmButton: null, navPath: null }
                      refs.confirmButton = el as unknown as ConfirmButtonExposed
                      setComponentRefs(idx, refs)
                    }
                  }"
                  :visible="getVisibility(idx).confirmButton"
                  @click="handleConfirmClick(idx)"
                />
                <!-- Nav Path -->
                <NavPath
                  v-else-if="block.type === 'nav-path'"
                  :ref="el => {
                    if (el) {
                      const refs = getComponentRefs(idx) || { typewriters: [], confirmationList: null, confirmButton: null, navPath: null }
                      refs.navPath = el as unknown as NavPathExposed
                      setComponentRefs(idx, refs)
                    }
                  }"
                  :route="block.route"
                  :visible="getVisibility(idx).navPath"
                />
              </template>
            </template>
          </div>
        </div>
        <!-- User message -->
        <div
          v-else
          class="message-wrapper user-wrapper"
        >
          <div class="message-bubble user-bubble">
            <span class="user-message-text">{{ (msg.content as string[]).join('') }}</span>
          </div>
        </div>
      </template>

      <!-- Loading indicator -->
      <div v-if="isLoading" class="message-wrapper bot-wrapper">
        <div class="bot-avatar">
          <v-icon size="16" style="font-variation-settings: 'FILL' 1">mdi-robot</v-icon>
        </div>
        <div class="message-bubble bot-bubble">
          <span class="typing-indicator">
            <span class="typing-dot"></span>
            <span class="typing-dot"></span>
            <span class="typing-dot"></span>
          </span>
        </div>
      </div>
    </div>

    <!-- Chat Input -->
    <ChatInput
      placeholder="输入你想说的..."
      :disabled="isLoading || isAnimating"
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

// Chat Container
.chat-container {
  max-width: 48rem;
  margin: 0 auto;
  padding: 6rem 1rem 8rem;
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
    color: $primary;
  }
}

// Message Bubbles
.message-bubble {
  padding: 1rem;
  border-radius: 1rem;
  max-width: 80%;

  &.bot-bubble {
    background: $surface-container-highest;
    color: $on-surface;
    box-shadow: 0 8px 24px rgba($on-surface, 0.04);
  }

  &.user-bubble {
    background: linear-gradient(135deg, $primary 0%, $primary-container 100%);
    color: $on-primary;
    box-shadow: 0 8px 24px rgba($on-surface, 0.04);
  }
}

.message-text {
  font-family: 'Inter', sans-serif;
  font-size: 0.875rem;
  line-height: 1.6;
}

.user-message-text {
  font-family: 'Inter', sans-serif;
  font-size: 0.875rem;
  line-height: 1.6;
  white-space: pre-wrap;
  word-break: break-word;
}

// Navigation Path
.nav-path {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.875rem;
  padding: 0.5rem 0;
  margin-top: 0.5rem;

  .path-step {
    color: $on-surface-variant;

    &.highlight {
      color: $primary;
      font-weight: 500;
    }

    &.secondary {
      color: $secondary;
      font-weight: 500;
    }
  }

  .path-arrow {
    display: flex;
    align-items: center;
  }
}

// Continue Button
.continue-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.625rem 1.5rem;
  background: linear-gradient(135deg, $primary 0%, $primary-container 100%);
  color: $on-primary;
  border-radius: 9999px;
  font-family: 'Inter', sans-serif;
  font-size: 0.875rem;
  font-weight: 500;
  box-shadow: 0 4px 12px rgba($on-surface, 0.08);
  transition: all 300ms ease;
  margin-top: 1rem;

  &:active {
    transform: scale(0.95);
  }

  &:hover {
    box-shadow: 0 8px 24px rgba($on-surface, 0.12);
  }
}

// Typing Indicator
.typing-indicator {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 0.25rem 0;
}

.typing-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: $on-surface-variant;
  animation: typing-bounce 1.4s infinite ease-in-out;

  &:nth-child(1) {
    animation-delay: 0s;
  }

  &:nth-child(2) {
    animation-delay: 0.2s;
  }

  &:nth-child(3) {
    animation-delay: 0.4s;
  }
}

@keyframes typing-bounce {
  0%, 60%, 100% {
    transform: translateY(0);
  }
  30% {
    transform: translateY(-4px);
  }
}
</style>
