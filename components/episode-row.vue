<template lang="pug">
div.row
  nuxt-link(:to="'/channels/'+episode.key")
    cover.cover(:channel="episode.key" :size='30' radius='50%')
  a(:href="episode.link" target="_blank")
    span.title(v-text="episode.title")
</template>

<style lang="sass" scoped>
div.row
  padding: 5px 0
  position: relative
  display: -webkit-flex
  -webkit-flex-wrap: wrap
  display: flex
  flex-wrap: wrap
  margin-left: 100px
  white-space: nowrap
  overflow: hidden
  text-overflow: ellipsis
  &:hover
    color: #3a8ee6
  &.small
    margin-left: 0
    .title
      height: 20px
      line-height: 20px
      font-size: 11px
.cover
  width: 30px
.title
  height: 30px
  line-height: 30px
  width: calc(100% - 40px)
  margin-left: 10px
  overflow: hidden
  white-space: nowrap
  text-overflow: ellipsis
</style>

<script>
export default {
  components: {
    'cover': require('~/components/cover.vue').default
  },
  props: {
    episode: {
      required: true
    }
  }
}
</script>
