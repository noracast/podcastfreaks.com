<template lang="pug">
div
  h2 新着エピソード
  h5 今週　　{{ episodes_in_1weeks.length }} episodes
  .this-week
    template(v-for="(val, key) in episodes_in_1weeks")
      .border(v-if="!isSame(val.pubDate)")
        span.date(v-text="date(val.pubDate)")
      episode-row(:episode="val")
  h5 先週　　{{ episodes_in_2weeks.length }} episodes
  .last-week
    template(v-for="(val, key) in episodes_in_2weeks")
      .border(v-if="!isSame(val.pubDate)")
        span.date(v-text="date(val.pubDate)")
      episode-row(:episode="val")
</template>

<style lang="sass?indentedSyntax" scoped>

.border
  height: 0
  border-top: 1px solid #ccc
  margin: 10px 0
  position: relative
  .date
    position: absolute
    top: 10px
    padding: 5px 0
    height: 30px
    line-height: 30px

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
    'allpodcasts': require('~/components/allpodcasts.vue').default,
    'cover': require('~/components/cover.vue').default,
    'episode-row': require('~/components/episode-row.vue').default,
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
      channels: build_info.channels,
      current_date: null
    }
  },
  methods: {
    date: function(_date) {
      moment.locale('ja')

      return moment(_date).format('M/D(ddd)')
    },
    isSame: function(_date) {
      if(this.current_date && this.current_date.isSame(_date,'day')){
        return true
      }
      this.current_date = moment(_date)
      return false
    }
  }
}
</script>