<template lang="pug">
div.wrap
  h1 Podcast Activities
  podcast(:feeds="feeds" :title="'ALL'")
  podcast(v-for="(item, index) in feeds" :feed="item" :key="index")
</template>

<style lang="sass?indentedSyntax" scoped>
.wrap
  display: flex
  flex-direction: column
  justify-content: center
  align-items: center
</style>

<script>
import axios from 'axios'
import xml2js from '~/lib/xml2js-promise'
import rss from '~/data/rss.json'

export default {
  components: {
    'podcast': require('~/components/podcast.vue').default
  },
  data: function(){
    return {feeds: Object.keys(rss).map(i => `./rss/${i}.rss`)}
  }
}
</script>