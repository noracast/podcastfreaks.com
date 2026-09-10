<template>
  <a-blank class="hashtag" :href="url" :title="`${hashtag} を X で検索`">
    <!-- @ と同じ理由で、文字ではなく自分で描いた図形にしている。
         文字だと字形の重心がフォントごとに違い、隣に並ぶアイコンと
         上下の位置が環境によってずれる -->
    <!-- svg の右に、ホバーしたときだけ名前（.label）を出す。見た目は
         pages/index.vue の .links で指定する。svg との間に改行を入れると
         出力に半角空白が入るので、閉じタグに続けて書く -->
    <svg viewBox="0 0 24 24" width="14" height="14" role="img" :aria-label="`${hashtag} を X で検索`">
      <g fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round">
        <path d="M4.8 9.4h14.4" />
        <path d="M3.9 15.2h14.4" />
        <path d="M10.5 4.3 8.7 20.3" />
        <path d="M16.4 4.3 14.6 20.3" />
      </g>
    </svg><span class="label">{{ tag }}</span>
  </a-blank>
</template>

<style scoped>
.hashtag {
  /* Podcast アイコン・@ と大きさと濃さを揃える */
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
    hashtag: {
      type: String,
      required: true
    }
  },
  computed: {
    // 先頭の # は字形の方で表しているので、名前からは外す
    tag() {
      return this.hashtag.replace('#', '')
    },
    url() {
      return `https://x.com/search?q=${encodeURIComponent(this.hashtag)}`
    }
  }
}
</script>
