<template lang="pug">
span(v-if="level" :class="level.name" :title="tooltip") {{ level.label }}
span(v-else v-text="'N/A'" title="エピソードが1話しかないため算出できません")
</template>

<style lang="sass" scoped>
span
  background-color: #ededed
  color: white
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
  // Duration と同じ作り。更新頻度が高いほど鮮やかで濃くする。
  // 色相は赤（355度）に固定し、彩度 88%→14%、明度 56%→44% で段階を作る。
  // Duration は青（216度）で、収録時間が短いほど鮮やか。
  // どちらも先頭が最も鮮やかで、末尾へ向かってくすんでいく
  &.daily
    background-color: #F22C3D
  &.semiweekly
    background-color: #E13341
  &.weekly
    background-color: #CE3B47
  &.biweekly
    background-color: #BB444E
  &.monthly
    background-color: #A55057
  &.quarterly
    background-color: #91595E
  &.rarely
    background-color: #806063
</style>

<script>
import { frequencyLevel } from '@/lib/frequency-label'

export default {
  props: {
    // 直近エピソードの投稿間隔の中央値（日）。prebuild で算出している
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
      return `直近の投稿間隔の中央値: ${this.interval}日`
    }
  }
}
</script>
