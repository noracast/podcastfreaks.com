<template lang="pug">
podcast(:feed="feed")
</template>

<style lang="sass?indentedSyntax" scoped>
</style>

<script>
export default {
  components: {
    'podcast': require('~/components/podcast.vue').default
  },
  async asyncData({ app, params }) {
    return {
      feed: `../downloads/rss/${params.id}.rss`
    }
  }
}
</script>