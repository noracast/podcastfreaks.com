<template lang="pug">
div
  h2 Channels
  h5 {{ channels.length }}
  table
    thead
      tr
        th
        th Title
        th Twitter
        th Hashtag
        th Total
        th First
        th Last
    tbody
      tr(v-for="(val, key) in channels" :key="key")
        td.cover
          nuxt-link(:to="'/channels/'+key")
            cover(:channel="key")
        th
          nuxt-link(:to="'/channels/'+key" v-text="val.title")
          a.feed(:href="feed(key)" target="_blank") {{ feed(key) }}
          button.copy(type="button" v-clipboard:copy="feed(key)" :title="feed(key)") Copy RSS
        td
          a(:href="'https://twitter.com/'+twitter(key).replace('@','')" v-text="twitter(key)" v-if="twitter(key)")
        td
          a(:href="'https://twitter.com/search?q=%23'+hashtag(key).replace('#','')" v-text="hashtag(key)" v-if="hashtag(key)")
        td {{ val.total }}
        td {{ val.firstDate | formatDate }}
        td {{ val.lastDate | formatDate }}
</template>

<style lang="sass?indentedSyntax" scoped>
table
  width: 100%
th,td
  text-align: left
  vertical-align: top
  padding: 10px 0

thead
  color: #ddd
  font-size: 12px
tbody
  th,td
    border-top: 1px solid #ddd
    font-weight: 500
    font-size: 15px
    vertical-align: middle

  th
    font-weight: bold
  td.cover
    padding-right: 10px

.feed
  display: block
  color: #ccc
  font-size: 10px
  margin-top: 5px
  &:hover
    color: #aaa
.copy
  font-size: 8px
</style>

<script>
import axios from 'axios'
import moment from 'moment'
import xml2js from '~/lib/xml2js-promise'
import rss from '~/data/rss.json'
import build_info from '~/static/downloads/build_info.json'

export default {
  components: {
    'allpodcasts': require('~/components/allpodcasts.vue').default,
    'cover': require('~/components/cover.vue').default,
    'podcast': require('~/components/podcast.vue').default
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
      episodes_in_1weeks,
      episodes_in_2weeks,
      channels: build_info.channels
    }
  },
  methods: {
    feed: function(key) {
      return rss[key].feed
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