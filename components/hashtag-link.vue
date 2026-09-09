<template lang="pug">
a-blank.hashtag(:href="url" :title="`${hashtag} を X で検索`") #
</template>

<style lang="sass" scoped>
.hashtag
  // Podcast / X のアイコンと並ぶので、大きさと濃さを揃える
  display: inline-flex
  align-items: center
  justify-content: center
  width: 14px
  height: 14px
  font-size: 15px
  font-weight: bold
  line-height: 1
  opacity: 0.35
  transition-duration: 0.2s
  &:hover
    opacity: 1
    transition-duration: 0.2s
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
    url() {
      return `https://x.com/search?q=${encodeURIComponent(this.hashtag)}`
    }
  }
}
</script>
