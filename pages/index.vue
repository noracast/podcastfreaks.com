<template lang="pug">
div
  h1 Podcast Activities
  podcast(v-for="(item, index) in feeds" :feed="item" :key="index")
</template>

<style>
</style>

<script>
import axios from 'axios'
import xml2js from '~/lib/xml2js-promise'
import rss from '~/data/rss.json'

export default {
  components: {
    'podcast': require('./podcast.vue').default
  },
  data: function(){
    return rss
  }
}
</script>