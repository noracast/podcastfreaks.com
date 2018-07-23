<template lang="pug">
div
  el-header
    h1 Podcast Freaks
    small Last update: {{ updated }}
  el-main
    //- VuejsHeatmap
    allpodcasts(:feeds="feeds")

    h2 新着エピソード
    h5 今週　　{{ episodes_in_1weeks.length }} episodes
    el-collapse
      el-collapse-item(v-for="(val, key) in episodes_in_1weeks" :title="title(val)" :key="key" :name="key")
        .warp
          h3
            a(:href="val.link" v-text="val.title" target='_blank')
          div.description(v-html="val.description")
    h5 先週　　{{ episodes_in_2weeks.length }} episodes
    el-collapse
      el-collapse-item(v-for="(val, key) in episodes_in_2weeks" :title="title(val)" :key="key" :name="key")
        .warp
          h3
            a(:href="val.link" v-text="val.title" target='_blank')
          div.description(v-html="val.description")

    h2 登録チャンネル
    h5 {{ channels.length }}
    ol
      li(v-for="(val, key) in channels" :key="key")
        nuxt-link(:to="'channel/'+key" v-text="val")
        a(:href="'https://twitter.com/'+twitter(key).replace('@','')" v-text="twitter(key)" v-if="twitter(key)")
        a(:href="'https://twitter.com/search?q=%23'+hashtag(key).replace('#','')" v-text="hashtag(key)" v-if="hashtag(key)")
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
ol
  li
    color: #303133
    font-size: 13px
    font-weight: 500
    padding-bottom: 1em
    a
      text-decoration: none
      display: block
      &:first-child
        font-size: 15px
        font-weight: bold
</style>

<script>
import axios from 'axios'
import moment from 'moment'
import xml2js from '~/lib/xml2js-promise'
import rss from '~/data/rss.json'
import build_info from '~/static/downloads/build_info.json'
import VuejsHeatmap from 'vuejs-heatmap'
import ElementUI from 'element-ui'
import 'element-ui/lib/theme-chalk/index.css'

export default {
  components: {
    'podcast': require('~/components/podcast.vue').default,
    'allpodcasts': require('~/components/allpodcasts.vue').default
  },
  data: function() {
    const aweekago = moment().subtract(7, 'days').startOf('date')
    var episodes_in_1weeks = []
    var episodes_in_2weeks = []
    build_info.episodes_in_2weeks.forEach((item, index)=> {
      if(moment(item.pubDate).isAfter(aweekago)){
        episodes_in_1weeks.push(item)
      }
      else {
        episodes_in_2weeks.push(item)
      }
    })
    return {
      feeds: build_info.load_order.map(i => `./downloads/rss/${i}.rss`),
      updated: moment(build_info.updated).format("YYYY/MM/DD h:mm:ss a"),
      episodes_in_1weeks,
      episodes_in_2weeks,
      channels: build_info.channels
    }
  },
  methods: {
    title: function(ep) {
      return `${this.$options.filters.formatDate(ep.pubDate)}　　${ep.channel_title}`
    },
    twitter: function(key) {
      return rss[key].twitter
    },
    hashtag: function(key) {
      return rss[key].hashtag
    }
  }
}
</script>