<template lang="pug">
div
  el-header
    h1 Podcast Activities
    small Last update: {{ updated }}
  el-main
    allpodcasts(:feeds="feeds")
    h2
      | 新着エピソード
      small (2weeks)
    el-collapse
      el-collapse-item(v-for="(item, index) in episodes_in_2weeks" :title="title(item)" :key="index" :name="index")
        .warp
          h3
            a(:href="item.link" v-text="item.title" target="_blank")
          div.description(v-html="item.description")
    h2 登録チャンネル
    nuxt-link.channel(v-for="(val, key) in channels" :to="'channel/'+key" v-text="val" :key="key")
</template>

<style lang="sass?indentedSyntax" scoped>
header
  margin-bottom: 60px
.warp
  background-color: #f2f6fc
  padding: 30px
  border-radius: 8px
.description
  border-top: 1px solid #333
.channel
  display: inline-block
  margin-right: 1em
</style>

<script>
import axios from 'axios'
import moment from 'moment'
import xml2js from '~/lib/xml2js-promise'
import rss from '~/data/rss.json'
import build_info from '~/static/downloads/build_info.json'
import ElementUI from 'element-ui'
import 'element-ui/lib/theme-chalk/index.css'

export default {
  components: {
    'podcast': require('~/components/podcast.vue').default,
    'allpodcasts': require('~/components/allpodcasts.vue').default
  },
  data: function() {
    return {
      feeds: build_info.load_order.map(i => `./downloads/rss/${i}.rss`),
      updated: moment(build_info.updated).format("YYYY/MM/DD h:mm:ss a"),
      episodes_in_2weeks: build_info.episodes_in_2weeks,
      channels: build_info.channels
    }
  },
  methods: {
    title: function(ep) {
      return `${this.$options.filters.formatDate(ep.pubDate)}　　${ep.channel_title}`
    }
  }
}
</script>