<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'

const secondary = '#006a63'

const windowWidth = ref(typeof window !== 'undefined' ? window.innerWidth : 1200)

const updateWidth = () => {
  windowWidth.value = window.innerWidth
}

onMounted(() => {
  window.addEventListener('resize', updateWidth)
  updateWidth()
})

onUnmounted(() => {
  window.removeEventListener('resize', updateWidth)
})

const isMobile = () => windowWidth.value < 600
const isDesktop = () => windowWidth.value >= 600
</script>

<template>
  <v-main>
    <!-- Desktop Header -->
    <header
      v-if="isDesktop()"
      class="desktop-header"
    >
      <div class="header-content">
        <div class="logo">健康管家</div>

        <nav class="nav-links">
          <a href="#" class="nav-link active">首页</a>
          <a href="#" class="nav-link">问诊</a>
          <a href="#" class="nav-link">健康</a>
          <a href="#" class="nav-link">我的</a>
        </nav>

        <router-link to="/settings">
          <v-btn
            icon
            variant="text"
            class="settings-btn"
            size="small"
          >
            <v-icon size="24">mdi-cog</v-icon>
          </v-btn>
        </router-link>
      </div>
    </header>

    <!-- Mobile Header -->
    <header
      v-if="isMobile()"
      class="mobile-header"
    >
      <div class="header-content">
        <div class="logo">健康管家</div>
      </div>
    </header>

    <!-- Main Content -->
    <div class="page-wrapper">
      <div class="main-container">
        <!-- Welcome Section -->
        <section class="welcome-section">
          <h1 class="welcome-headline">
            今天 AI 能为您提供什么帮助？
          </h1>
        </section>

        <!-- Service Cards Section -->
        <section class="cards-section">
          <div class="cards-grid">
            <!-- Triage Card -->
            <router-link to="/triage-chat" class="service-card">
              <div class="card-content">
                <div class="icon-container">
                  <v-icon size="32" :color="secondary">mdi-medical-bag</v-icon>
                </div>
                <h2 class="card-title">智能导诊助手</h2>
                <p class="card-description">帮助您快速前往相应诊室。</p>
              </div>
              <div class="card-action">
                <v-btn
                  icon
                  size="48"
                  class="arrow-btn"
                >
                  <v-icon size="24" color="white">mdi-arrow-right</v-icon>
                </v-btn>
              </div>
            </router-link>

            <!-- Recovery Card -->
            <router-link to="/recovery-chat" class="service-card">
              <div class="card-content">
                <div class="icon-container">
                  <v-icon size="32" :color="secondary">mdi-hospital-box</v-icon>
                </div>
                <h2 class="card-title">病后恢复助手</h2>
                <p class="card-description">获取量身定制的个性化康复计划。</p>
              </div>
              <div class="card-action">
                <v-btn
                  icon
                  size="48"
                  class="arrow-btn"
                >
                  <v-icon size="24" color="white">mdi-arrow-right</v-icon>
                </v-btn>
              </div>
            </router-link>

            <!-- Navigation Card -->
            <router-link to="/triage-car" class="service-card">
              <div class="card-content">
                <div class="icon-container">
                  <v-icon size="32" :color="secondary">mdi-directions</v-icon>
                </div>
                <h2 class="card-title">导航指引</h2>
                <p class="card-description">查看前往诊室的实时导航路线。</p>
              </div>
              <div class="card-action">
                <v-btn
                  icon
                  size="48"
                  class="arrow-btn"
                >
                  <v-icon size="24" color="white">mdi-arrow-right</v-icon>
                </v-btn>
              </div>
            </router-link>
          </div>
        </section>
      </div>

      <!-- Mobile Bottom Navigation -->
      <nav
        v-if="isMobile()"
        class="bottom-nav"
      >
        <a href="#" class="nav-item active">
          <v-icon size="24">mdi-home</v-icon>
          <span>首页</span>
        </a>
        <a href="#" class="nav-item">
          <v-icon size="24">mdi-chat</v-icon>
          <span>问诊</span>
        </a>
        <a href="#" class="nav-item">
          <v-icon size="24">mdi-account</v-icon>
          <span>我的</span>
        </a>
      </nav>
    </div>
  </v-main>
</template>

<style scoped lang="scss">
// Clinical Sanctuary Design Tokens
$primary: #00606d;
$primary-container: #007b8b;
$secondary-container: #8bf1e6;
$surface-container-low: #f1f4f5;
$surface-container: #ebeeef;
$surface-container-lowest: #ffffff;
$on-surface: #181c1d;
$on-surface-variant: #3e494b;
$background: #f7fafb;

// Page wrapper for bottom nav positioning
.page-wrapper {
  min-height: 100dvh;
  display: flex;
  flex-direction: column;
}

// Header Styles
.desktop-header {
  position: sticky;
  top: 0;
  z-index: 100;
  background: rgba(241, 244, 245, 0.8);
  backdrop-filter: blur(20px);
  border-bottom: none;
  padding: 1rem 1.5rem;
  box-shadow: 0 4px 40px rgba(24, 28, 29, 0.06);
}

.mobile-header {
  position: sticky;
  top: 0;
  z-index: 100;
  background: rgba(247, 250, 251, 0.8);
  backdrop-filter: blur(20px);
  padding: 1rem 1.5rem;
}

.header-content {
  width: 100%;
  max-width: 1280px;
  margin: 0 auto;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.logo {
  font-family: 'Manrope', sans-serif;
  font-weight: 600;
  font-size: 1.125rem;
  color: $primary;
  letter-spacing: -0.02em;
}

.nav-links {
  display: flex;
  gap: 0.25rem;
}

.nav-link {
  font-family: 'Inter', sans-serif;
  font-weight: 500;
  font-size: 0.875rem;
  color: $on-surface-variant;
  text-decoration: none;
  padding: 0.5rem 1rem;
  border-radius: 9999px;
  transition: all 300ms ease;
  background: transparent;

  &:hover {
    background: rgba(0, 0, 0, 0.04);
  }

  &.active {
    color: $primary;
    background: rgba(0, 96, 109, 0.08);
  }
}

.settings-btn {
  color: $primary !important;
}

// Main Container
.main-container {
  max-width: 1280px;
  margin: 0 auto;
  padding: 2rem 1.5rem 6rem;
  flex: 1;

  @media (min-width: 960px) {
    padding: 3rem 2rem;
  }
}

// Welcome Section
.welcome-section {
  margin-bottom: 3rem;

  @media (min-width: 960px) {
    margin-bottom: 4rem;
    margin-left: 2rem;
  }
}

.welcome-headline {
  font-family: 'Manrope', sans-serif;
  font-weight: 700;
  font-size: 2.5rem;
  line-height: 1.2;
  color: $on-surface;
  max-width: 36rem;

  @media (min-width: 600px) {
    font-size: 2.75rem;
  }

  @media (min-width: 1280px) {
    font-size: 3rem;
  }
}

// Cards Section
.cards-section {
  margin-bottom: 4rem;
}

.cards-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 1.5rem;

  @media (min-width: 600px) {
    grid-template-columns: repeat(3, 1fr);
    gap: 1.5rem;
  }
}

// Service Card
.service-card {
  background: $surface-container;
  border-radius: 1rem;
  padding: 2rem;
  min-height: 300px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  cursor: pointer;
  transition: all 300ms ease;
  text-decoration: none;
  color: inherit;

  &:hover {
    background: $surface-container-lowest;

    .arrow-btn {
      transform: scale(1.05);
    }
  }
}

.card-content {
  flex: 1;
}

.icon-container {
  width: 64px;
  height: 64px;
  border-radius: 50%;
  background: $secondary-container;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 1.5rem;
}

.card-title {
  font-family: 'Manrope', sans-serif;
  font-weight: 700;
  font-size: 1.5rem;
  color: $on-surface;
  margin-bottom: 0.75rem;
}

.card-description {
  font-family: 'Inter', sans-serif;
  font-size: 1.125rem;
  line-height: 1.6;
  color: $on-surface-variant;
}

.card-action {
  display: flex;
  justify-content: flex-end;
  margin-top: 2rem;
}

.arrow-btn {
  width: 48px !important;
  height: 48px !important;
  background: linear-gradient(135deg, $primary 0%, $primary-container 100%) !important;
  color: white !important;
  transition: transform 300ms ease;
}

// Bottom Navigation
.bottom-nav {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  z-index: 100;
  display: flex;
  justify-content: space-around;
  align-items: center;
  padding: 0.75rem 1rem 1.5rem;
  background: rgba(247, 250, 251, 0.9);
  backdrop-filter: blur(20px);
  border-top-left-radius: 2rem;
  border-top-right-radius: 2rem;
  box-shadow: 0 -1px 0 rgba(189, 200, 203, 0.15), 0 -8px 30px rgba(0, 0, 0, 0.04);
}

.nav-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: $on-surface-variant;
  text-decoration: none;
  font-family: 'Inter', sans-serif;
  font-size: 0.6875rem;
  font-weight: 500;
  padding: 0.5rem;
  border-radius: 9999px;
  min-width: 4rem;
  transition: all 300ms ease;

  .v-icon {
    margin-bottom: 0.25rem;
  }

  span {
    margin-top: 0.25rem;
  }

  &.active {
    color: white;
    background: $primary;
    padding: 0.5rem 1.25rem;
    transform: scale(1);
  }

  &:active {
    transform: scale(0.9);
  }
}
</style>
