<template>
  <a-blank class="apple" :href="url" title="Apple Podcasts で開く">
    <!-- 放送を表す汎用のアイコン（中心の点と左右の弧）。
         外部のアイコンセットはクレジット表示や商標の条件が付くため、自分で描いている -->
    <!-- svg の右に、ホバーしたときだけ名前（.label）を出す。見た目は
         pages/index.vue の .links で指定する。svg との間に改行を入れると
         出力に半角空白が入るので、閉じタグに続けて書く -->
    <svg viewBox="0 0 24 24" width="14" height="14" role="img" aria-label="Apple Podcasts で開く">
      <circle cx="12" cy="12" r="2.8" fill="currentColor" />
      <g fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round">
        <path d="M8.2 15.8a5.4 5.4 0 0 1 0-7.6" />
        <path d="M15.8 8.2a5.4 5.4 0 0 1 0 7.6" />
        <path d="M5 19a9.9 9.9 0 0 1 0-14" />
        <path d="M19 5a9.9 9.9 0 0 1 0 14" />
      </g>
    </svg><span class="label">Apple Podcasts</span>
  </a-blank>
</template>

<style scoped>
.apple {
  /* タイトルの邪魔をしないよう控えめに置き、ホバーで前に出す */
  display: inline-flex;
  align-items: center;
  opacity: 0.35;
  transition-duration: 0.2s;
  &:hover {
    opacity: 1;
    transition-duration: 0.2s;
  }
  & svg {
    display: block;
  }
}
</style>

<script>
export default {
  props: {
    url: {
      type: String,
      required: true
    }
  }
}
</script>
