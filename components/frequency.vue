<template lang="pug">
span(v-if="interval != null" :title="tooltip") {{ label }}
span.na(v-else title="エピソードが1話しかないため算出できません") N/A
</template>

<style lang="sass" scoped>
span
  display: block
  white-space: nowrap
  &.na
    color: #ccc
</style>

<script>
import frequencyLabel from '@/lib/frequency-label'

export default {
  props: {
    // 直近エピソードの投稿間隔の中央値（日）。prebuild で算出している
    interval: {
      type: Number,
      default: null
    }
  },
  computed: {
    label() {
      return frequencyLabel(this.interval)
    },
    tooltip() {
      if(this.interval == null) return null
      return `直近の投稿間隔の中央値: ${this.interval}日`
    }
  }
}
</script>
