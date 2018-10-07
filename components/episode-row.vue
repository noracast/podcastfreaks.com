<template lang="pug">
a(:href="episode.link" target="_blank")
  cover.cover(:channel="episode.key" :size='30' radius='50%')
  span.title(v-text="episode.title")
</template>

<style lang="sass?indentedSyntax" scoped>
a
  padding: 5px 0
  position: relative
  display: -webkit-flex
  -webkit-flex-wrap: wrap
  display: flex
  flex-wrap: wrap
  margin-left: 100px
  &:hover
    color: #3a8ee6
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