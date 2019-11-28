<template lang="pug">
Responsive.root(:breakpoints="{small: el => el.width <= 900}")
  div(slot-scope="el" :class="{ small: el.is.small }")
    template(v-if="episodes_in_1weeks.length")
      h5 今週の新着エピソード　　{{ episodes_in_1weeks.length }} episodes
      .this-week
        template(v-for="(val, idx) in episodes_in_1weeks")
          //- 違う日だったら
          .border(v-if="idx == 0 || !isSame(val.pubDate, episodes_in_1weeks[idx-1].pubDate)")
            span.date(v-text="date(val.pubDate)")
          episode-row(:episode="val" :class="{ small: el.is.small }")
    template(v-if="episodes_in_2weeks.length")
      h5 先週の新着エピソード　　{{ episodes_in_2weeks.length }} episodes
      .last-week
        template(v-for="(val, idx) in episodes_in_2weeks")
          //- 違う日だったら
          .border(v-if="idx == 0 || !isSame(val.pubDate, episodes_in_2weeks[idx-1].pubDate)")
            span.date(v-text="date(val.pubDate)")
          episode-row(:episode="val" :class="{ small: el.is.small }")
</template>

<style lang="sass">
.root
  padding-top: 0
.border
  height: 0
  border-top: 1px solid #ccc
  margin: 10px 0
  position: relative

.date
  position: absolute
  top: 10px
  padding: 5px 20px
  height: 30px
  line-height: 30px

div.small
  .border
    height: auto
    margin-left: -20px
    margin-right: 0
  .date
    font-size: 11px
    height: 20px
    line-height: 20px
    position: relative
    margin-left: 20px
    padding-left: 10px
h5
  padding: 0 20px
.row.small
  padding-left: 20px
</style>

<script>
import axios from 'axios'
import moment from 'moment'
import xml2js from '@/lib/xml2js-promise'
import rss from '@/data/rss.json'
import build_info from '@/static/downloads/build_info.json'

export default {
  components: {
    'episode-row': require('@/components/episode-row.vue').default,
    'podcast': require('@/components/podcast.vue').default
  },
  data: function() {
    const aweekago = moment().subtract(7, 'days').startOf('date')
    let episodes_in_1weeks = []
    let episodes_in_2weeks = []
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
      console.log(_date)
      moment.locale('ja')
      return moment(_date).format('M/D(ddd)')
    },
    isSame: function(_date1, _date2) {
      const __date1 = new Date(_date1)
      const __date2 = new Date(_date2)
      return __date1.getDate()==__date2.getDate() &&
        __date1.getMonth()==__date2.getMonth() &&
        __date1.getFullYear()==__date2.getFullYear()
    }
  },
  head() {
    return {
      title: 'New episodes | Podcast Freaks - Japanese techie podcast archive'
    }
  }
}
</script>
