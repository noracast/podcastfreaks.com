<template>
<div>
  <div id="cal-heatmap"></div>
  <ul>
    <li v-for="item in data">
      <a v-bind:href="item.link">
        {{item.title}}
      </a>
    </li>
  </ul>
</div>
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
    cal.init({})
  },
  asyncData ({params}, callback) {
    axios.get(`http://feeds.rebuild.fm/rebuildfm`)
      .then((res) => {
        var xml = res.data
        xml2js.parseString(xml, (message, xmlres) => {
          callback(null, {data: xmlres.rss.channel[0].item})
        })
      })
      .catch((e) => {
        callback({ statusCode: 404, message: 'ページが見つかりません' })
      })
  }
}
</script>