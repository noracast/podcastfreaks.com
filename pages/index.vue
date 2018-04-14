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
import xml2js from 'xml2js'
import d3 from 'd3'
import CalHeatMap from 'cal-heatmap'

export default {
  mounted () {
    var cal = new CalHeatMap()
    var now = new Date().getTime() / 1000
    var startDate = new Date()
    startDate.setMonth(startDate.getMonth() - 5)
    var data = {}
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
  },
  asyncData ({params}, callback) {
    axios.get('http://feeds.rebuild.fm/rebuildfm')
      .then((res) => {
        var xml = res.data
        xml2js.parseString(xml, (message, xmlres) => {
          var channel = xmlres.rss.channel[0];
          callback(null, {
            title: channel.title[0],
            episodes: channel.item
          })
        })
      })
      .catch((e) => {
        callback({ statusCode: 404, message: 'Error: Not found.' })
      })
  }
}
</script>