<template lang="pug">
div
  h3 {{ title }}
  a(href="feed") {{ feed }}
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
      episodes: []
    }
  },
  mounted () {
    this.loadRSS(`https://rssproxy.karappo.net/?url=${this.feed}`)
    .then(res => {

      this.title = res.title
      this.episodes = res.episodes

      var cal = new CalHeatMap()
      var now = new Date().getTime() / 1000
      var startDate = new Date()
      startDate.setMonth(startDate.getMonth() - 5)
      var data = {}
      if(this.episodes){
        this.episodes.forEach(function(ep, index) {
          var date = new Date(ep.pubDate).getTime() / 1000
          data[date] = 1
        })
        cal.init({
          itemSelector: this.$el.querySelector('.heatmap'),
          data: data,
          // afterLoadData: parser,
          // cellSize: 7,
          domain: 'month',
          subDomain: 'day',
          range: 6,
          tooltip: true,
          start: startDate,
          legendColors: ['white','green'],
          domainLabelFormat: '%b',
          legend: [1]
         })
      }
    })

  },
  methods: {
    async loadRSS (url) {
      let xml = await axios.get(url)
      let json = await xml2js(xml.data, {explicitArray: false})
      return {
        title: json.rss.channel.title,
        episodes: json.rss.channel.item
      }
    }
  }
}
</script>