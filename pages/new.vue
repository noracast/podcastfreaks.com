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

<!--
  スコープを付けている。以前はスコープなしで .date { position: absolute; padding: 5px 20px }
  などがグローバルに漏れ、一覧ページ（pages/index.vue）でリンクを持たない番組の
  日付が20pxずれる、位置が飛ぶ、といった不具合を起こしていた。
  episode-row はコンポーネントのルート要素にスコープが付くため .row.small は今までどおり効く
-->
<style lang="sass" scoped>
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
import { jst } from '@/lib/jst'
import rss from '@/data/rss.json'
import build_info from '@/static/downloads/build_info.json'

export default {
  components: {
    'episode-row': require('@/components/episode-row.vue').default,
    'podcast': require('@/components/podcast.vue').default
  },
  data: function() {
    // ビルド時刻を基準に、日本時間で「今週」と「先週」に振り分ける。
    // moment() を使うと実行のたびに基準が変わり、UTC のビルドサーバーと
    // JST の閲覧者で件数が食い違ってハイドレーションが壊れる
    const aweekago = jst(build_info.updated).subtract(7, 'days').startOf('date')
    let episodes_in_1weeks = []
    let episodes_in_2weeks = []
    build_info.episodes_in_2weeks.forEach((item, index)=> {
      if(jst(item.pubDate).isAfter(aweekago)){
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
      return jst(_date).format('M/D(ddd)')
    },
    // 日付の区切り線を出すかの判定。表示と同じ日本時間で比べる
    isSame: function(_date1, _date2) {
      return jst(_date1).isSame(jst(_date2), 'day')
    }
  },
  head() {
    return {
      title: 'New episodes | Podcast Freaks - Japanese techie podcast archive'
    }
  }
}
</script>
