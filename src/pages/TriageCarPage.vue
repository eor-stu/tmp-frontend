<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { fetchNodes, fetchCost } from '@/services/mapApi'

const router = useRouter()
const route = useRoute()

// ============================================================================
// Data — node_id ↔ zh mapping (fetched from backend)
// ============================================================================
interface LocationNode {
  id: string
  name: string
  icon: string
}

const iconMap: Record<string, string> = {
  entrance:             'mdi-door-open',
  quit:                 'mdi-door-closed',
  registration_center:  'mdi-ticket-outline',
  emergency_clinic:     'mdi-stethoscope',
  surgery_clinic:       'mdi-needle',
  internal_clinic:      'mdi-heart-pulse',
  pediatric_clinic:     'mdi-baby-face-outline',
  pharmacy:             'mdi-pill',
  payment_center:       'mdi-cash',
  toilet:               'mdi-toilet',
}

const nodeMap = ref<Record<string, LocationNode>>({})
const isLoading = ref(true)

function getInitialPath(): string[] {
  const raw = route.query.previous_path
  if (typeof raw !== 'string' || !raw.trim()) return ['entrance', 'quit']
  return raw.split(',').filter((id) => nodeMap.value[id] != null)
}

const allLocationIds = computed(() => Object.keys(nodeMap.value))

// ============================================================================
// State
// ============================================================================
const currentPath = ref<string[]>([])
const phase = ref<'planning' | 'navigating'>('planning')
const currentStepIndex = ref(0)
const isDragOver = ref(false)
const dragSource = ref<{ type: 'pool' | 'path'; name: string; index?: number } | null>(null)
const edgeCosts = ref<Record<string, number | null>>({})

let dragCounter = 0

// ============================================================================
// Computed
// ============================================================================
const availableLocations = computed(() =>
  allLocationIds.value.filter((id) => !currentPath.value.includes(id)),
)

const isLastStep = computed(() => currentStepIndex.value >= currentPath.value.length)

function getEstimatedTime(stepIndex: number): number | null {
  if (stepIndex === 0) return 0
  const key = currentPath.value[stepIndex - 1] + '->' + currentPath.value[stepIndex]
  const cost = edgeCosts.value[key]
  if (cost === null || cost === undefined) return null
  return cost * 5
}

onMounted(async () => {
  try {
    const nodes = await fetchNodes()
    for (const n of nodes) {
      nodeMap.value[n.id] = {
        id: n.id,
        name: n.name,
        icon: iconMap[n.id] || 'mdi-map-marker',
      }
    }
    currentPath.value = getInitialPath()
  } finally {
    isLoading.value = false
  }
})

// ============================================================================
// Drag & Drop
// ============================================================================
function handleDragStart(e: DragEvent, nameOrIndex: string | number, type: 'pool' | 'path') {
  if (type === 'pool') {
    const name = nameOrIndex as string
    e.dataTransfer!.effectAllowed = 'move'
    e.dataTransfer!.setData('text/plain', name)
    dragSource.value = { type: 'pool', name }
  } else {
    const index = nameOrIndex as number
    const name = currentPath.value[index]
    e.dataTransfer!.effectAllowed = 'move'
    e.dataTransfer!.setData('text/plain', name)
    dragSource.value = { type: 'path', name, index }
  }
}

function onPathDragEnter(e: DragEvent) {
  e.preventDefault()
  dragCounter++
  isDragOver.value = true
}

function onPathDragLeave() {
  dragCounter--
  if (dragCounter <= 0) {
    dragCounter = 0
    isDragOver.value = false
  }
}

function onPathDrop(e: DragEvent, insertAt: number) {
  e.preventDefault()
  dragCounter = 0
  isDragOver.value = false

  if (!dragSource.value) return

  const src = dragSource.value
  if (src.type === 'pool') {
    currentPath.value.splice(insertAt, 0, src.name)
  } else if (src.type === 'path' && src.index !== undefined) {
    const oldIndex = src.index
    const adjustedInsert = oldIndex < insertAt ? insertAt - 1 : insertAt
    const [removed] = currentPath.value.splice(oldIndex, 1)
    currentPath.value.splice(adjustedInsert, 0, removed)
  }

  dragSource.value = null
}

function removeFromPath(index: number) {
  if (currentPath.value.length <= 1) return
  currentPath.value.splice(index, 1)
}

// ============================================================================
// Navigation
// ============================================================================
async function confirmRoute() {
  const costs: Record<string, number | null> = {}
  for (let i = 1; i < currentPath.value.length; i++) {
    const key = currentPath.value[i - 1] + '->' + currentPath.value[i]
    try {
      costs[key] = await fetchCost(currentPath.value[i - 1], currentPath.value[i])
    } catch {
      costs[key] = null
    }
  }
  edgeCosts.value = costs
  phase.value = 'navigating'
  currentStepIndex.value = 0
}

function nextStep() {
  currentStepIndex.value++
}

function exitNavigation() {
  router.push('/')
}
</script>

<template>
  <v-main>
    <!-- ================================================================== -->
    <!-- Phase-level transition: planning ↔ navigating -->
    <!-- ================================================================== -->
    <Transition name="fade" mode="out-in">
      <!-- Phase 1: Route Planning -->
      <div v-if="phase === 'planning'" key="planning" class="planning-page">
      <!-- Decorative blobs -->
      <div class="bg-blob bg-blob--primary" />
      <div class="bg-blob bg-blob--secondary" />

      <div class="planning-container">
        <!-- Loading state -->
        <template v-if="isLoading">
          <div class="loading-state">
            <v-progress-circular indeterminate color="#00606d" size="40" width="3" />
            <p class="loading-text">加载地图数据...</p>
          </div>
        </template>

        <template v-else>
        <h2 class="planning-title">路线规划</h2>

        <!-- Path display (drop zone) -->
        <div
          class="path-area"
          :class="{ 'drag-over': isDragOver }"
          @dragover.prevent
          @dragenter="onPathDragEnter"
          @dragleave="onPathDragLeave"
          @drop="onPathDrop($event, currentPath.length)"
        >
          <template v-for="(loc, i) in currentPath" :key="i">
            <!-- Connector arrow between chips -->
            <div
              v-if="i > 0"
              class="path-connector"
              @dragover.prevent.stop
              @drop.stop="onPathDrop($event, i)"
            >
              <v-icon size="16" color="#bdc8cb">mdi-chevron-right</v-icon>
            </div>
            <!-- Location chip -->
            <div
              class="path-chip"
              draggable="true"
              @dragstart="handleDragStart($event, i, 'path')"
              @dragover.prevent.stop
              @drop.stop="onPathDrop($event, i)"
            >
              <v-icon size="14" class="chip-icon">{{ nodeMap[loc]?.icon || 'mdi-map-marker' }}</v-icon>
              <span class="chip-text">{{ nodeMap[loc]?.name || loc }}</span>
              <button
                class="chip-remove"
                :disabled="currentPath.length <= 1"
                @click="removeFromPath(i)"
              >
                <v-icon size="14">mdi-close</v-icon>
              </button>
            </div>
          </template>
        </div>

        <!-- Hint -->
        <p class="hint-text">
          拖拽下方地点到路径中，或拖动路径中的地点调整顺序
        </p>

        <!-- Available locations pool -->
        <div class="pool-section">
          <h3 class="pool-title">可选地点</h3>
          <div v-if="availableLocations.length > 0" class="pool-grid">
            <div
              v-for="loc in availableLocations"
              :key="loc"
              class="pool-card"
              draggable="true"
              @dragstart="handleDragStart($event, loc, 'pool')"
            >
              <v-icon size="20" class="pool-card-icon">
                {{ nodeMap[loc]?.icon || 'mdi-map-marker' }}
              </v-icon>
              <span>{{ nodeMap[loc]?.name || loc }}</span>
            </div>
          </div>
          <p v-else class="empty-pool">所有地点已在路径中</p>
        </div>

        <!-- Confirm button -->
        <button class="confirm-btn" @click="confirmRoute">
          确认路线，开始导航
        </button>
        </template>
      </div>
    </div>

    <!-- ================================================================== -->
    <!-- Phase 2: Navigation (per-location modals) -->
    <!-- ================================================================== -->
    <div v-else key="navigating" class="modal-overlay">
      <!-- Decorative blobs -->
      <div class="bg-blob bg-blob--primary" />
      <div class="bg-blob bg-blob--secondary" />

      <div class="modal-card" :class="{ 'modal-card--completion': isLastStep }">
        <div class="modal-card__glow" />

        <Transition name="fade" mode="out-in">
          <!-- Per-location navigation -->
          <div v-if="!isLastStep" :key="'step-' + currentStepIndex" class="modal-card__body">
            <div class="modal-card__top">
              <div class="direction-icon">
                <v-icon size="36" color="white">mdi-arrow-right-bold</v-icon>
              </div>
              <div class="info-col">
                <h2 class="info-col__headline">
                  下一地点：{{ nodeMap[currentPath[currentStepIndex]]?.name || currentPath[currentStepIndex] }}
                </h2>
                <div class="time-badge">
                  <v-icon size="16" color="var(--color-on-surface-variant)">
                    mdi-clock-outline
                  </v-icon>
                  <span class="time-badge__text">
                    预计时间：{{ getEstimatedTime(currentStepIndex) !== null ? getEstimatedTime(currentStepIndex) + '分钟' : '未知' }}
                  </span>
                </div>
              </div>
            </div>

            <button class="cta-btn" @click="nextStep">
              下一地点
            </button>
          </div>

          <!-- Completion dialog -->
          <div v-else key="completion" class="modal-card__body">
            <div class="modal-card__top completion-top">
              <div class="direction-icon completion-icon">
                <v-icon size="40" color="white">mdi-check-circle-outline</v-icon>
              </div>
              <h2 class="completion-headline">完成就诊！</h2>
              <p class="completion-sub">
                您已到达路线终点，感谢使用智能导诊。
              </p>
            </div>

            <button class="cta-btn" @click="exitNavigation">
              退出
            </button>
          </div>
        </Transition>
      </div>
    </div>
    </Transition>
  </v-main>
</template>

<style scoped lang="scss">
// ============================================================================
// Design Tokens (Clinical Sanctuary)
// ============================================================================
$primary: #00606d;
$primary-container: #007b8b;
$secondary-container: #8bf1e6;
$surface-container-lowest: #ffffff;
$surface-container: #ebeeef;
$surface-container-high: #e5e9ea;
$on-primary: #ffffff;
$on-surface: #181c1d;
$on-surface-variant: #3e494b;
$outline-variant: #bdc8cb;
$background: #f7fafb;

// ============================================================================
// Phase 1 — Route Planning
// ============================================================================
.planning-page {
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

.planning-container {
  width: 100%;
  max-width: 480px;
  background: rgba($surface-container-lowest, 0.8);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border-radius: 1.5rem;
  padding: 2rem;
  border: 1px solid rgba($outline-variant, 0.15);
  box-shadow: 0 20px 40px -15px rgba($on-surface, 0.06);
}

.planning-title {
  font-family: 'Manrope', sans-serif;
  font-weight: 700;
  font-size: 1.25rem;
  color: $primary;
  margin: 0 0 1.5rem;
  letter-spacing: -0.02em;
}

.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 3rem 0;
  gap: 1rem;
}

.loading-text {
  font-family: 'Inter', sans-serif;
  font-size: 0.875rem;
  color: $on-surface-variant;
  opacity: 0.6;
  margin: 0;
}

// Path display (drop zone)
.path-area {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.25rem;
  padding: 1rem;
  background: rgba($surface-container, 0.5);
  border-radius: 1rem;
  border: 2px dashed rgba($outline-variant, 0.3);
  min-height: 3rem;
  transition: border-color 200ms ease, background 200ms ease;

  &.drag-over {
    border-color: $primary-container;
    background: rgba($primary-container, 0.06);
  }
}

.path-connector {
  display: flex;
  align-items: center;
  padding: 0 0.125rem;
  cursor: default;
}

.path-chip {
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  padding: 0.375rem 0.5rem 0.375rem 0.625rem;
  background: $surface-container-lowest;
  border: 1px solid rgba($outline-variant, 0.25);
  border-radius: 9999px;
  font-family: 'Inter', sans-serif;
  font-size: 0.8125rem;
  color: $on-surface-variant;
  cursor: grab;
  transition: transform 150ms ease, box-shadow 150ms ease;
  user-select: none;

  &:active {
    cursor: grabbing;
  }

}

.chip-icon {
  flex-shrink: 0;
  color: inherit;
}

.chip-text {
  white-space: nowrap;
}

.chip-remove {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  border: none;
  background: rgba($on-surface-variant, 0.08);
  color: $on-surface-variant;
  cursor: pointer;
  padding: 0;
  opacity: 0.5;
  transition: opacity 150ms ease, background 150ms ease;

  &:hover:not(:disabled) {
    opacity: 1;
    background: rgba($on-surface-variant, 0.15);
  }

  &:disabled {
    opacity: 0.15;
    cursor: not-allowed;
  }
}

.hint-text {
  font-family: 'Inter', sans-serif;
  font-size: 0.8125rem;
  color: $on-surface-variant;
  opacity: 0.65;
  margin: 0.75rem 0 1.5rem;
  text-align: center;
  line-height: 1.4;
}

// Available locations pool
.pool-section {
  margin-bottom: 1.5rem;
}

.pool-title {
  font-family: 'Inter', sans-serif;
  font-weight: 600;
  font-size: 0.8125rem;
  color: $on-surface-variant;
  margin: 0 0 0.75rem;
  opacity: 0.7;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.pool-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 0.5rem;
}

.pool-card {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.625rem 0.875rem;
  background: rgba($surface-container, 0.5);
  border: 1px solid rgba($outline-variant, 0.15);
  border-radius: 0.75rem;
  font-family: 'Inter', sans-serif;
  font-size: 0.8125rem;
  color: $on-surface;
  cursor: grab;
  transition: transform 150ms ease, box-shadow 150ms ease;
  user-select: none;

  &:active {
    cursor: grabbing;
    transform: scale(0.97);
  }

  &:hover {
    box-shadow: 0 4px 12px rgba($on-surface, 0.06);
    background: rgba($surface-container-lowest, 0.7);
  }
}

.pool-card-icon {
  flex-shrink: 0;
  color: $primary;
}

.empty-pool {
  font-family: 'Inter', sans-serif;
  font-size: 0.8125rem;
  color: $on-surface-variant;
  opacity: 0.45;
  text-align: center;
  padding: 1.5rem 0;
  margin: 0;
}

// Confirm button
.confirm-btn {
  width: 100%;
  padding: 1rem 0;
  border-radius: 9999px;
  background: linear-gradient(135deg, $primary 0%, $primary-container 100%);
  color: $on-primary;
  font-family: 'Manrope', sans-serif;
  font-weight: 700;
  font-size: 1rem;
  letter-spacing: 0.02em;
  border: 1px solid rgba($surface-container-lowest, 0.2);
  box-shadow: 0 8px 20px -6px rgba($primary, 0.4);
  cursor: pointer;
  position: relative;
  overflow: hidden;
  transition: transform 150ms ease;

  &::before {
    content: '';
    position: absolute;
    inset: 0;
    background: linear-gradient(
      90deg,
      transparent 0%,
      rgba($surface-container-lowest, 0.2) 50%,
      transparent 100%
    );
    transform: translateX(-100%);
    transition: none;
  }

  &:hover::before {
    animation: shimmer 1.5s infinite;
  }

  &:active {
    transform: scale(0.98);
  }
}

// ============================================================================
// Phase 2 — Navigation Modal (glassmorphism, reused from original)
// ============================================================================
.modal-overlay {
  position: fixed;
  inset: 0;
  z-index: 10;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1.5rem;
  background: rgba($background, 0.5);
  backdrop-filter: blur(4px);
  -webkit-backdrop-filter: blur(4px);
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

// Glassmorphism card
.modal-card {
  position: relative;
  width: 100%;
  max-width: 320px;
  aspect-ratio: 4 / 3;
  background: rgba($surface-container-lowest, 0.7);
  backdrop-filter: blur(40px);
  -webkit-backdrop-filter: blur(40px);
  border-radius: 2rem;
  border: 1px solid rgba($outline-variant, 0.15);
  box-shadow: 0 20px 40px -15px rgba($on-surface, 0.06);
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  overflow: hidden;

  &--completion {
    aspect-ratio: 4 / 5;
  }
}

.modal-card__glow {
  position: absolute;
  top: 0;
  right: 0;
  width: 8rem;
  height: 8rem;
  background: rgba($primary-container, 0.2);
  border-radius: 50%;
  filter: blur(40px);
  z-index: -10;
}

.modal-card__body {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}

.modal-card__top {
  display: flex;
  align-items: center;
  gap: 1.25rem;
  margin-top: 0.5rem;
}

// Direction icon
.direction-icon {
  width: 64px;
  height: 64px;
  flex-shrink: 0;
  border-radius: 50%;
  background: linear-gradient(135deg, $primary 0%, $primary-container 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 8px 16px -4px rgba($primary, 0.3);
}

// Info column
.info-col {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.info-col__headline {
  font-family: 'Manrope', sans-serif;
  font-weight: 700;
  font-size: 1.125rem;
  line-height: 1.25;
  color: $primary;
  letter-spacing: -0.02em;
  margin: 0;
}

// Time badge
.time-badge {
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  padding: 0.375rem 0.75rem;
  background: rgba($surface-container-high, 0.5);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border-radius: 9999px;
  border: 1px solid rgba($outline-variant, 0.1);
  width: fit-content;

  &__text {
    font-family: 'Inter', sans-serif;
    font-size: 0.875rem;
    font-weight: 500;
    color: $on-surface-variant;
  }
}

// CTA button
.cta-btn {
  width: 100%;
  padding: 1rem 0;
  margin-top: 1.5rem;
  border-radius: 9999px;
  background: linear-gradient(135deg, $primary 0%, $primary-container 100%);
  color: $on-primary;
  font-family: 'Manrope', sans-serif;
  font-weight: 700;
  font-size: 1rem;
  letter-spacing: 0.02em;
  border: 1px solid rgba($surface-container-lowest, 0.2);
  box-shadow: 0 8px 20px -6px rgba($primary, 0.4);
  cursor: pointer;
  position: relative;
  overflow: hidden;
  transition: transform 150ms ease;

  &::before {
    content: '';
    position: absolute;
    inset: 0;
    background: linear-gradient(
      90deg,
      transparent 0%,
      rgba($surface-container-lowest, 0.2) 50%,
      transparent 100%
    );
    transform: translateX(-100%);
    transition: none;
  }

  &:hover::before {
    animation: shimmer 1.5s infinite;
  }

  &:active {
    transform: scale(0.98);
  }
}

// ============================================================================
// Completion dialog overrides
// ============================================================================
.completion-top {
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: 0.75rem;
}

.completion-icon {
  width: 80px;
  height: 80px;
}

.completion-headline {
  font-family: 'Manrope', sans-serif;
  font-weight: 700;
  font-size: 1.25rem;
  color: $primary;
  letter-spacing: -0.02em;
  margin: 0;
}

.completion-sub {
  font-family: 'Inter', sans-serif;
  font-size: 0.875rem;
  color: $on-surface-variant;
  opacity: 0.7;
  margin: 0;
  line-height: 1.5;
}

// ============================================================================
// Shared keyframes
// ============================================================================
@keyframes shimmer {
  0% {
    transform: translateX(-100%);
  }
  100% {
    transform: translateX(100%);
  }
}

// ============================================================================
// Transition classes
// ============================================================================
.fade-enter-active,
.fade-leave-active {
  transition: opacity 200ms ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
