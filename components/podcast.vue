<template lang="pug">
div
  h3 {{ title }}
  a(:href="feed") RSS
  a(:href="link" v-if="link") Web
  br
  button.btn.prev
    i.icon.icon-chevron-left
  button.btn.next
    i.icon.icon-chevron-right
  .heatmap
</template>

<style lang="sass?indentedSyntax">
h3
  display: inline-block
  margin-top: 20px
  margin-right: 20px
div
  >a
    margin-right: 10px
.btn
  margin-right: 5px
  &:focus,
  &:active
    outline: 0
.heatmap
  margin-top: 10px
</style>

<script>
import axios from 'axios'
import CalHeatMap from 'cal-heatmap'
import d3 from 'd3'
import xml2js from '~/lib/xml2js-promise'

export default {
  props: ['feed'],
  data: function(){
    return {
      title: null,
      link: null,
      episodes: []
    }
  },
  mounted () {
    this.loadRSS(`./rss/${this.feed}.rss`)
    .then(res => {

      this.title = res.title
      this.link = res.link
      this.episodes = res.episodes

      let cal = new CalHeatMap()
      let now = new Date().getTime() / 1000
      let startDate = new Date()
      startDate.setMonth(startDate.getMonth() - 11)
      var data = {}
      if(this.episodes){
        this.episodes.forEach(function(ep, index) {
          let date = new Date(ep.pubDate).getTime() / 1000
          data[date] = 1
        })
        cal.init({
          itemSelector: this.$el.querySelector('.heatmap'),
          data: data,
          // afterLoadData: parser,
          // cellSize: 7,
          domain: 'month',
          subDomain: 'day',
          tooltip: true,
          start: startDate,
          legendColors: ['white','#c068ff'],
          domainLabelFormat: '%b',
          legend: [1],
          displayLegend: false,
          previousSelector: this.$el.querySelector('.prev'),
          nextSelector: this.$el.querySelector('.next'),
         })
      }
    })

  },
  methods: {
    async loadRSS (url) {
      let xml = await axios.get(url)
      let json = await xml2js(xml.data, {explicitArray: false})
      let channel = json.rss.channel
      return {
        title: channel.title,
        link: channel.link,
        episodes: channel.item
      }
    }
  }
}
</script>