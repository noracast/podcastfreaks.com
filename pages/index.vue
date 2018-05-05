<template lang="pug">
div.wrap
  h1 Podcast Activities
  span Last update: {{ updated }}
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
import moment from 'moment'
import xml2js from '~/lib/xml2js-promise'
import rss from '~/data/rss.json'
import build_info from '~/static/downloads/build_info.json'

export default {
  components: {
    'podcast': require('~/components/podcast.vue').default
  },
  data: function() {
    return {
      feeds: build_info.load_order.map(i => `./downloads/rss/${i}.rss`),
      updated: moment(build_info.updated).format("YYYY/MM/DD h:mm:ss a")
    }
  }
}
</script>