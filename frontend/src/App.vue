<script setup lang="ts">
import { onMounted, ref } from 'vue'

interface Creator {
  id: string
  name: string
  createdAt: string
  followerCount: number
  isFollowing: boolean
}

const userIdStorageKey = 'little-circle-user-id'
const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const creators = ref<Creator[]>([])
const userId = ref('')
const isLoading = ref(true)
const busyCreatorId = ref('')
const errorMessage = ref('')

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`/api${url}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  })

  if (response.status === 204) {
    return undefined as T
  }

  const contentType = response.headers.get('content-type')
  const data: unknown = contentType?.includes('application/json')
    ? await response.json()
    : undefined
  if (!response.ok) {
    const message =
      typeof data === 'object' &&
      data !== null &&
      'error' in data &&
      typeof data.error === 'string'
        ? data.error
        : 'Something went wrong. Please try again.'
    throw new Error(message)
  }
  return data as T
}

async function loadCreators() {
  creators.value = await request<Creator[]>(
    `/creators?userId=${encodeURIComponent(userId.value)}`,
  )
}

async function initializeUser() {
  const storedId = localStorage.getItem(userIdStorageKey)
  const id = storedId && uuidPattern.test(storedId) ? storedId : crypto.randomUUID()

  await request<{ id: string; name: string }>('/users/anonymous', {
    method: 'POST',
    body: JSON.stringify({ id }),
  })
  localStorage.setItem(userIdStorageKey, id)
  userId.value = id
}

async function toggleFollow(creator: Creator) {
  if (busyCreatorId.value) return

  busyCreatorId.value = creator.id
  errorMessage.value = ''
  try {
    if (creator.isFollowing) {
      await request(`/creators/${creator.id}/followers/${userId.value}`, {
        method: 'DELETE',
      })
    } else {
      await request(`/creators/${creator.id}/followers`, {
        method: 'POST',
        body: JSON.stringify({ userId: userId.value }),
      })
    }
    await loadCreators()
  } catch (error) {
    errorMessage.value =
      error instanceof Error ? error.message : 'Unable to update your follow.'
  } finally {
    busyCreatorId.value = ''
  }
}

function initials(name: string) {
  return name
    .split(' ')
    .map((part) => part[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()
}

onMounted(async () => {
  try {
    await initializeUser()
    await loadCreators()
  } catch (error) {
    errorMessage.value =
      error instanceof Error ? error.message : 'Unable to load creators.'
  } finally {
    isLoading.value = false
  }
})
</script>

<template>
  <div class="page-shell">
    <header class="topbar">
      <a class="brand" href="#" aria-label="Little Circle home">
        <span class="brand-mark" aria-hidden="true">
          <svg viewBox="0 0 32 32" fill="none">
            <path
              d="M16 25.5c-4.9-3-9.2-6.1-9.2-11a5.2 5.2 0 0 1 9.2-3.4 5.2 5.2 0 0 1 9.2 3.4c0 4.9-4.3 8-9.2 11Z"
              fill="currentColor"
            />
            <path d="M16 10v15" stroke="#fff" stroke-width="1.5" stroke-linecap="round" />
          </svg>
        </span>
        <span>little circle</span>
      </a>
      <span class="topbar-note"><span class="online-dot"></span> A little more inspiration</span>
    </header>

    <main>
      <section class="intro" aria-labelledby="page-title">
        <p class="eyebrow"><span class="eyebrow-sparkle">✳</span> GOOD THINGS GROW TOGETHER</p>
        <h1 id="page-title">Follow what <span>moves you.</span></h1>
        <p class="intro-copy">
          Meet the creators making the internet feel a little more human. Find your people,
          and keep up with what they make.
        </p>
        <div class="creator-total">
          <span class="total-avatars" aria-hidden="true">
            <span>✿</span><span>✦</span><span>●</span>
          </span>
          <span><strong>{{ creators.length }} lovely people</strong> to get to know</span>
        </div>
      </section>

      <section class="directory" aria-labelledby="directory-title">
        <div class="directory-heading">
          <div>
            <p class="section-kicker">YOUR NEXT FAVORITE</p>
            <h2 id="directory-title">Creators to follow</h2>
          </div>
          <span class="directory-count">{{ creators.length }} creators</span>
        </div>

        <p v-if="errorMessage" class="notice notice-error" role="alert">
          {{ errorMessage }}
        </p>
        <div v-if="isLoading" class="notice" role="status">Finding your circle…</div>
        <div v-else-if="creators.length === 0" class="notice">
          No creators yet. Please check back soon.
        </div>
        <div v-else class="creator-grid">
          <article
            v-for="(creator, index) in creators"
            :key="creator.id"
            class="creator-card"
          >
            <div class="creator-card-top">
              <div :class="['avatar', `avatar-tone-${index % 5}`]" aria-hidden="true">
                <span class="avatar-sparkle">✳</span>
                <span class="avatar-initials">{{ initials(creator.name) }}</span>
              </div>
              <span class="creator-badge"><span>✦</span> CREATOR</span>
            </div>
            <div class="creator-info">
              <h3>{{ creator.name }}</h3>
              <p>Independent creator</p>
            </div>
            <div class="creator-card-bottom">
              <div class="follower-count">
                <span class="follower-icon" aria-hidden="true">♡</span>
                <span>
                  <strong>{{ creator.followerCount.toLocaleString() }}</strong>
                  {{ creator.followerCount === 1 ? 'follower' : 'followers' }}
                </span>
              </div>
              <button
                :class="['follow-button', { following: creator.isFollowing }]"
                type="button"
                :disabled="busyCreatorId !== ''"
                :aria-label="`${creator.isFollowing ? 'Unfollow' : 'Follow'} ${creator.name}`"
                @click="toggleFollow(creator)"
              >
                <span v-if="busyCreatorId === creator.id" class="button-spinner" aria-hidden="true"></span>
                <template v-else>
                  <span aria-hidden="true">{{ creator.isFollowing ? '✓' : '+' }}</span>
                  {{ creator.isFollowing ? 'Unfollow' : 'Follow' }}
                </template>
              </button>
            </div>
          </article>
        </div>
      </section>
    </main>

    <footer class="footer">
      <span class="footer-flower" aria-hidden="true">✿</span>
      <span>Small circles. Big inspiration.</span>
      <span class="footer-sparkle" aria-hidden="true">✳</span>
    </footer>
  </div>
</template>
