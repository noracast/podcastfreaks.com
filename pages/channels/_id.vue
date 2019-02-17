<template lang="pug">
podcast(:channelKey="channelKey")
</template>

<style lang="sass" scoped>
</style>

<script>
export default {
  components: {
    'podcast': require('~/components/podcast.vue').default
  },
  async asyncData({ app, params }) {
    return {
      channelKey: params.id
    }
  }
}
</script>