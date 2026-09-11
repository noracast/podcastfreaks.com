<template>
  <!-- 再生と一時停止の印。トップの子行、/episodes の行、右下のプレーヤーのつまみで
       同じ形を使う。色は currentColor なので、置いた先の文字色に従う -->
  <svg viewBox="0 0 24 24" :width="size" :height="size" aria-hidden="true">
    <g v-if="playing" fill="currentColor">
      <rect x="6" y="5" width="4" height="14" rx="1" />
      <rect x="14" y="5" width="4" height="14" rx="1" />
    </g>
    <path v-else fill="currentColor" d="M8 5.5v13l11-6.5z" />
  </svg>
</template>

<script>
export default {
  props: {
    // 鳴らしている間は一時停止の印にする
    playing: {
      type: Boolean,
      default: false
    },
    size: {
      type: Number,
      default: 16
    }
  }
}
</script>
