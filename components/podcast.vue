<template lang="pug">
div
  div(v-if="title")
    template(v-if="link")
      a(:href="link")
        h3(v-if="title") {{ title }}
    template(v-else)
      h3(v-if="title") {{ title }}
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
import _ from 'lodash'

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
    let def_config = {
      itemSelector: this.$el.querySelector('.heatmap'),
      domain: 'year',
      subDomain: 'day',
      range: 1,
      tooltip: true,
      // start: moment().subtract(1, 'years').toDate(),
      domainLabelFormat: '',
      domainGutter: 0,
      previousSelector: this.$el.querySelector('.prev'),
      nextSelector: this.$el.querySelector('.next'),
    }

    if(this.feed) {
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
        cal.init(_.merge(def_config, {
          data: data,
          legend: [90],
          itemName: ["minute", 'minutes'],
          displayLegend: false
         }))
      })
    }
    else if(this.feeds){
      this.title = 'All Podcasts'
      this.loadRSSs(this.feeds)
      .then(res => {
        cal.init(_.merge(def_config, {
          data: res,
          legend: [1,2,3,4,5]
         }))
      })
    }
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
    },
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