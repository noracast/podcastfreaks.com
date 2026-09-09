<template lang="pug">
a-blank.x(:href="url" :title="`${account} を X で開く`")
  //- ロゴではなく @ の字形にする。データの表記（@account）と一致し、
  //- 隣に並ぶ # とも対になって読める
  span @
</template>

<style lang="sass" scoped>
.x
  // # のリンクと並べたときに揃って見えるようにする。
  // @ は丸く面積の大きい字形なので、同じ文字サイズだと大きく見える。
  // 数値ではなく見た目で揃うところまで下げている
  display: inline-flex
  align-items: center
  justify-content: center
  width: 14px
  height: 14px
  font-size: 12px
  font-weight: bold
  line-height: 1
  // @ は字形の重心がベースラインより下にあり、箱の中央に揃えても
  // 1.6px ほど下がって見える（# はほぼズレなし）。実測して打ち消す
  transform: translateY(-1.6px)
  opacity: 0.35
  transition-duration: 0.2s
  &:hover
    opacity: 1
    transition-duration: 0.2s
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
    url() {
      return `https://x.com/${this.account.replace('@', '')}`
    }
  }
}
</script>
