<template lang="pug">
nuxt-link.help(:to="to" :title="title" :aria-label="title" @click.native="stopSort")
  //- # や @ と同じく、文字ではなく自分で描いた図形にしている。
  //- 文字の ? は字形の重心がフォントごとに違い、隣の見出しの文字と
  //- 上下の位置が環境によってずれる。
  //- 丸で囲むと小さい字の並びの中で塊に見えてしまうので、字形だけを置く
  svg(viewBox="0 0 24 24" width="13" height="13" aria-hidden="true")
    //- 13px と小さいうえ、触れたときにしか出ないので、
    //- 行に並ぶ # や @（2.2）より太くしないと読み取りづらい
    g(fill="none" stroke="currentColor" stroke-width="2.8" stroke-linecap="round")
      path(d="M7.8 8.2A4.2 4.2 0 1 1 14.6 11.2c-1.4 1.1-2.6 1.6-2.6 3.2v1")
      circle(cx="12" cy="20.2" r="1.5" fill="currentColor" stroke="none")
</template>

<style lang="sass" scoped>
.help
  display: inline-flex
  align-items: center
  margin-left: 2px
  // 見出しの文字（#ccc）より少し濃くする。薄いままだと印だと気づけない
  color: #a5a5a5
  // ふだんは出さず、見出しに触れたときだけ出す（出す指定は置いた側が持つ）。
  // display ではなく透明にしておくのは、出たり消えたりで見出しの幅が
  // 変わらないようにするため
  opacity: 0
  transition-duration: 0.2s
  &:hover,
  &:focus-visible
    color: #7f00ff
    transition-duration: 0.2s
  // キーボードで辿り着いたときは、触れていなくても見えないと困る
  &:focus-visible
    opacity: 1
  svg
    display: block
</style>

<script>
export default {
  props: {
    to: {
      type: String,
      required: true
    },
    // 「◯◯ の見方」の ◯◯ に入る列名
    label: {
      type: String,
      required: true
    }
  },
  computed: {
    title() {
      return `${this.label} の見方`
    }
  },
  methods: {
    // 列見出しはセル全体が並べ替えのクリック領域なので、ここで止める。
    // 止めるのは親へ伝わる分だけで、リンク自身の処理は同じ要素にあるため動く
    stopSort(event) {
      event.stopPropagation()
    }
  }
}
</script>
