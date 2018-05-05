<template lang="pug">
div.wrap
  h1 Podcast Activities
  span Last update: {{ updated }}
  podcast(:feeds="feeds" :title="'ALL'" v-if="feeds")
  podcast(:feed="feed" :title="'個別'" v-if="feed")
  //podcast(v-for="(item, index) in feeds" :feed="item" :key="index")
  .btns
    .btn(v-for="(item, index) in channels" v-html="item" :key="index" v-on:click="change(item)")
</template>

<style lang="sass?indentedSyntax" scoped>
.wrap
  display: flex
  flex-direction: column
  justify-content: center
  align-items: center
.btns
  width: 634px
  margin-top: 40px
.btn
  margin-bottom: 5px
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
      feed: null,
      channels: build_info.load_order,
      updated: moment(build_info.updated).format("YYYY/MM/DD h:mm:ss a")
    }
  },
  methods: {
    change: function(val) {
      console.log(this.feeds)
      console.log(this.feed)
      this.feeds = null
      this.feed = `./downloads/rss/${val}.rss`
      console.log(this.feeds)
      console.log(this.feed)
    }
  }
}
</script>