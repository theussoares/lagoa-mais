<script setup lang="ts">
interface Props {
  /** Muda a cada tentativa: o token do captcha vale uma vez. */
  resetKey: number
}

interface Emits {
  (event: 'token', token: string): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()
const box = useTemplateRef<HTMLElement>('box')
const captcha = useTurnstile(box)

// Peça de navegador (widget do Cloudflare), não componente de tela: por isso observa o token e o pedido de reinício.
watch(captcha.token, (token) => emit('token', token), { immediate: true })
watch(() => props.resetKey, () => captcha.reset())
</script>

<template>
  <div v-if="captcha.enabled" ref="box" class="min-h-[65px]" />
</template>
