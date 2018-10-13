<template lang="pug">
div
  button.prev(circle) ←
  button.next(circle) →
  .heatmap
</template>

<style lang="sass?indentedSyntax">
h3
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
  props: ['feeds'],
  mounted () {
    let cal = new CalHeatMap()
    this.loadRSSs(this.feeds)
    .then(res => {
      cal.init({
        data: res,
        itemSelector: this.$el.querySelector('.heatmap'),
        domain: 'year',
        subDomain: 'day',
        itemName: ['episode', 'episodes'],
        range: 1,
        tooltip: true,
        // start: moment().subtract(1, 'years').toDate(),
        domainLabelFormat: '',
        domainGutter: 0,
        previousSelector: this.$el.querySelector('.prev'),
        nextSelector: this.$el.querySelector('.next'),
        legend: [1,2,3,4,5]
      })
    })
  },
  methods: {
    async loadRSSs (urls) {
      let data = {}
      for(let i = 0; i < urls.length; i++) {
        let xml = await axios.get(urls[i])
        let json = await xml2js(xml.data, {explicitArray: false})
        json.rss.channel.item.forEach(function(ep, index) {
          let date = new Date(ep.pubDate).getTime() / 1000
          let duration = moment.duration(ep['itunes:duration'])
          data[date] = data[date] ? data[date]+1 : 1
        })
      }
      return data
    }
  }
}
</script>