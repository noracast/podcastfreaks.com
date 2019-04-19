<template lang="pug">
div.row
  cover.cover(:channel="episode.key" :size='30' radius='50%')
  a.text(:href="episode.link" target="_blank")
    span.channel {{ episode.channel_title }}
    | {{ episode.title[0] }}
</template>

<style lang="sass" scoped>
div.row
  padding: 5px 0
  position: relative
  display: flex
  flex-wrap: nowrap
  margin-left: 100px
  white-space: nowrap
  overflow: hidden
  text-overflow: ellipsis
  height: 30px
  &:hover
    color: #3a8ee6
  .cover
    flex-shrink: 0
  .text
    flex-shrink: 1
    height: 100%
    margin-left: 10px
    overflow: hidden
    white-space: nowrap
    text-overflow: ellipsis
    align-items: center
    .channel
      color: #fff
      padding-left: 1em
      font-size: 12px
      background: #8000ff
      padding: 5px 8px
      border-radius: 3px
      margin-right: 10px

  &.small
    margin-left: 10px
    .cover
      width: 30px
    .text
      font-size: 12px
      line-height: 30px
      .channel
        font-size: 10px
</style>

<script>
export default {
  components: {
    'cover': require('~/components/cover.vue').default
  },
  props: {
    episode: {
      required: true,
      type: Object
    }
  }
}
</script>
