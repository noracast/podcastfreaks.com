<template lang="pug">
span(v-if="level" :class="level.name" :title="tooltip") {{ level.label }}
span(v-else v-text="'N/A'" title="更新した日が1日分しかないため算出できません")
</template>

<style lang="sass" scoped>
span
  background-color: #ededed
  // 背景が明るいので文字は濃く。緑を暗くした色にして、地の色となじませる
  color: #154725
  font-weight: bold
  // Duration と同じ幅に揃える。一番長い「週2〜3」も12pxなら収まる
  width: 60px
  height: 23px
  border-radius: 23px
  // Duration と同じく、行の高さを箱の高さに合わせて上下中央に置く
  display: block
  line-height: 23px
  text-align: center
  font-size: 12px
  // Duration と同じく、更新頻度が高いほど鮮やか。
  // 色相は緑（140度）に固定し、彩度 88%→14% で段階を作る。
  // 明度は 55%→82% と上げていくので、末尾へ向かって淡くなる
  // （緑を暗くすると沈んで見えるため、暗くではなく淡くする）。
  // 全段とも濃い文字が乗るので、文字色は入れ替わらない。
  // Duration は青緑・白文字で、寒色と暖色で対にしている
  &.daily
    background-color: #27F26A
  &.semiweekly
    background-color: #4BE57E
  &.weekly
    background-color: #6CDA91
  &.biweekly
    background-color: #89D4A2
  &.monthly
    background-color: #A2D2B2
  &.quarterly
    background-color: #B8D3C1
  &.rarely
    background-color: #CBD8CF
</style>

<script>
import { frequencyLevel } from '@/lib/frequency-label'

export default {
  props: {
    // 直近の更新日の間隔の中央値（日）。prebuild で算出している
    interval: {
      type: Number,
      default: null
    }
  },
  computed: {
    level() {
      return frequencyLevel(this.interval)
    },
    tooltip() {
      if(this.interval == null) return null
      return `直近の更新間隔の中央値: ${this.interval}日`
    }
  }
}
</script>
