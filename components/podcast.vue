<template lang="pug">
div
  a(:href="link" target="_blank")
    h3 {{ title }}
  div
    el-button.prev(circle) ←
    el-button.next(circle) →
    .heatmap
</template>

<style lang="sass?indentedSyntax">
h3
  display: inline-block
  margin-top: 20px
  margin-right: 20px
  font-size: 18px
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
import moment from 'moment'

export default {
  props: ['feeds','feed'],
  data: function(){
    return {
      title: null,
      link: null
    }
  },
  mounted () {
    let cal = new CalHeatMap()
    this.loadRSS(this.feed)
    .then(res => {
      this.title = res.title
      this.link = res.link

      var data = {}
      res.episodes.forEach(function(ep, index) {
        let date = new Date(ep.pubDate).getTime() / 1000
        let duration = moment.duration(ep['itunes:duration'])
        data[date] = parseInt(duration.asMinutes(),10)
      })
      cal.init({
        data: data,
        itemSelector: this.$el.querySelector('.heatmap'),
        domain: 'year',
        subDomain: 'day',
        itemName: ['minute', 'minutes'],
        range: 1,
        tooltip: true,
        // start: moment().subtract(1, 'years').toDate(),
        domainLabelFormat: '',
        domainGutter: 0,
        previousSelector: this.$el.querySelector('.prev'),
        nextSelector: this.$el.querySelector('.next'),
        legend: [90],
        displayLegend: false
      })
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