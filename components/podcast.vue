<template lang="pug">
div
  cover.cover(:channel="channelKey" :size="0" :radius="0")
  a(:href="link" target="_blank")
    h3 {{ title }}
  .description {{ description }}
  .since Since: {{ since | formatDate }}
  .episodes Total episodes: {{ episodes }}
  div
    button.prev(circle) ←
    button.next(circle) →
    .heatmap
</template>

<style lang="sass?indentedSyntax" scoped>
.cover
  width: 250px
  height: 250px
.since,
.episodes
  font-size: 32px
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
  components: {
    'cover': require('~/components/cover.vue').default
  },
  props: {
    channelKey: {
      type: String,
      required: true
    }
  },
  data: function(){
    return {
      title: null,
      description: null,
      episodes: null,
      since: null,
      link: null
    }
  },
  mounted () {
    let cal = new CalHeatMap()
    this.loadRSS(`/downloads/rss/${this.channelKey}.rss`)
    .then(channel => {
      this.title = channel.title
      this.description = channel.description
      this.link = channel.link
      // channel.item is not array when it has only a episode
      if(!(channel.item instanceof Array)){
        channel.item = [channel.item]
      }
      this.episodes = channel.item.length
      this.since = channel.item[0].pubDate

      var data = {}
      channel.item.forEach(function(ep, index) {
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
      return json.rss.channel
    }
  }
}
</script>