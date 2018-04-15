<template lang="pug">
div
  h1 {{ title }}
  #heatmap
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
  mounted () {
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
        itemSelector: '#heatmap',
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
  },
  async asyncData ({ params }) {
    let xml = await axios.get('http://feeds.rebuild.fm/rebuildfm')
    let json = await xml2js(xml.data, {explicitArray: false})
    return {
      title: json.rss.channel.title,
      episodes: json.rss.channel.item
    }
  }
}
</script>