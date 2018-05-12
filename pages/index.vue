<template lang="pug">
div
  el-header
    h1 Podcast Activities
    small Last update: {{ updated }}
  el-main
    allpodcasts(:feeds="feeds")
    h2 新着エピソード
    h5 {{ episodes_in_2weeks.length }} episodes / 2 weeks
    el-collapse
      el-collapse-item(v-for="(val, key) in episodes_in_2weeks" :title="title(val)" :key="key" :name="key")
        .warp
          h3
            a(:href="val.link" v-text="val.title" target="_blank")
          div.description(v-html="val.description")
    h2 登録チャンネル
    h5 {{ channels.length }}
    ol
      li(v-for="(val, key) in channels" :key="key")
        nuxt-link.channel(:to="'channel/'+key" v-text="val")
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
ol
  li
    color: #303133
    font-size: 13px
    font-weight: 500
    a
      text-decoration: none
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