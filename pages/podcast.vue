<template lang="pug">
div
  h3 {{ title }}
  a(:href="feed") RSS
  | |
  a(:href="link" v-if="link") Web
  .heatmap
</template>

<style>
@import '//cdn.jsdelivr.net/cal-heatmap/3.3.10/cal-heatmap.css';
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
    this.loadRSS(`https://rssproxy.karappo.net/?url=${this.feed}`)
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
          displayLegend: false
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