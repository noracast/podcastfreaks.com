<template lang="pug">
a-blank.x(:href="url" :title="`${account} を X で開く`")
  //- ロゴではなく @ の字形にする。データの表記（@account）と一致し、
  //- 隣に並ぶ # とも対になって読める。
  //-
  //- 文字ではなく自分で描いた図形にしている。文字にすると @ の重心が
  //- フォントごとに違い、macOS で合わせた打ち消し（translateY）が
  //- iOS では逆に浮いて見えた。図形なら位置がどの環境でも変わらない
  svg(viewBox="0 0 24 24" width="14" height="14" role="img" :aria-label="`${account} を X で開く`")
    g(fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round")
      circle(cx="11.7" cy="12.4" r="3.5")
      path(d="M15.2 8.9v5.6c0 1.4.9 2.2 2.1 2.2 2.1 0 3.5-2 3.5-4.9 0-4.7-3.4-8-8.2-8-4.9 0-8.6 3.8-8.6 8.8 0 5 3.7 8.6 9 8.6 1.7 0 3.2-.3 4.5-.9")
  //- ホバーしたときだけ右横に出る名前。見た目は pages/index.vue の .links で指定する
  span.label {{ handle }}
</template>

<style scoped>
.x {
  /* Podcast アイコン・# と大きさと濃さを揃える */
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
    account: {
      type: String,
      required: true
    }
  },
  computed: {
    // 先頭の @ は字形の方で表しているので、名前からは外す
    handle() {
      return this.account.replace('@', '')
    },
    url() {
      return `https://x.com/${this.handle}`
    }
  }
}
</script>
