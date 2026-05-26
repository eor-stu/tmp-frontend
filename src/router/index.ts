import { createRouter, createWebHistory } from 'vue-router'
import type { RouteRecordRaw } from 'vue-router'

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    name: 'home',
    component: () => import('@/pages/HomePage.vue'),
  },
  {
    path: '/triage-chat',
    name: 'triage-chat',
    component: () => import('@/pages/TriageChat.vue'),
  },
  {
    path: '/settings',
    name: 'settings',
    component: () => import('@/pages/SettingsPage.vue'),
  },
  {
    path: '/recovery-chat',
    name: 'recovery-chat',
    component: () => import('@/pages/RecoveryChatPage.vue'),
  },
  {
    path: '/about',
    name: 'about',
    component: () => import('@/pages/About.vue'),
  },
  {
    path: '/triage-car',
    name: 'triage-car',
    component: () => import('@/pages/TriageCarPage.vue'),
  },
  {
    path: '/face-recognition',
    name: 'face-recognition',
    component: () => import('@/pages/FaceRecognitionPage.vue'),
  },
]

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
})

export default router
