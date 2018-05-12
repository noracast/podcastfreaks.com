<template lang="pug">
div.wrap
  h1 Podcast Activities
  span Last update: {{ updated }}
  allpodcasts(:feeds="feeds")
  // podcast(v-for="(item, index) in feeds" :feed="item" :key="index")
  section
    h2 Episodes in last 2 weeks
    article(v-for="(item, index) in episodes_in_2weeks" :key="index")
      h3 {{ item.podcast_title }}
      h4 {{ item.title }}
      small {{ item.pubDate | formatDate }}
      //p {{ item.description }}
</template>

<style lang="sass?indentedSyntax" scoped>
.wrap
  display: flex
  flex-direction: column
  justify-content: center
  align-items: center
</style>

<script>
import axios from 'axios'
import moment from 'moment'
import xml2js from '~/lib/xml2js-promise'
import rss from '~/data/rss.json'
import build_info from '~/static/downloads/build_info.json'
import ElementUI from 'element-ui';
import 'element-ui/lib/theme-chalk/index.css';

export default {
  components: {
    'podcast': require('~/components/podcast.vue').default,
    'allpodcasts': require('~/components/allpodcasts.vue').default
  },
  data: function() {
    return {
      feeds: build_info.load_order.map(i => `./downloads/rss/${i}.rss`),
      updated: moment(build_info.updated).format("YYYY/MM/DD h:mm:ss a"),
      episodes_in_2weeks: build_info.episodes_in_2weeks
    }
  }
}
</script>